var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
let md5 = require('md5')
var bcrypt = require('bcryptjs');
var User = require('../model/user.model');
var Role = require('../model/role.model');
const user = require('../model/user.model');

router.post('/signup', function (req, res) {
    var body = req.body;
    var obj = new User(body);

    if (!req.body.email || !req.body.password || !req.body.firstName || !req.body.country || !req.body.contact) {
        res.json({
            success: false,
            message: 'Data not sufficient'
        });
        return;
    }
    let salt = bcrypt.genSaltSync(10);
    let password = md5(obj['password'])
    obj['password'] = bcrypt.hashSync(password, salt);

    User.find({
        email: obj.email
    }, (error, emailData) => {
        if (emailData && emailData.length) {
            return res.json({
                success: false,
                message: 'User Already Registered'
            });
        }

        Role.findOne({
            name: 'User'
        }).exec(
            function (err, data) {
                if (err) {
                    return res.send(err);
                }
                obj.roles = [];
                obj.playlist = [];
                obj.loginTime = new Date();
                obj.initials = obj.firstName.charAt(0);
                const id = mongoose.Types.ObjectId(data._id);
                obj.roles.push(id);
                obj.save(function (err) {
                    if (err) {
                        return res.json({
                            success: false,
                            message: 'Unable to create User'
                        });
                    }
                    return res.json({
                        success: true,
                        message: 'User created Successfully'
                    });
                });
            });
    });
});

router.post('/login', function (req, res) {
    if (!req.body.email || !req.body.password) {
        res.json({
            success: false,
            message: 'Data not sufficient'
        });
    }
    User.findOne({
        email: req.body.email
    }).populate('roles').exec(function (err, loginData) {
        if (err) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
        }
        if (loginData) {
            let roles = [];
            let password = md5(req.body.password);
            bcrypt.compare(password, loginData.password, function (err, data) {
                if (err) {
                    res.json({
                        success: false,
                        message: 'Authentication failed. Not Entitled for the access.'
                    });
                }
                if (data) {
                    for (let i = 0; i < loginData.roles.length; i++) {
                        roles.push(loginData.roles[i].name);
                    }
                    const authObj = {
                        userId: loginData._id,
                        firstName: loginData.firstName,
                        lastName: loginData.lastName,
                        loginTime: loginData.loginTime,
                        contact: loginData.contact,
                        initials: loginData.initials,
                        roles: roles,
                        email: req.body.email,
                        playlist: req.body.playlist
                    };
                    User.findByIdAndUpdate(authObj.userId, { loginTime: new Date() });
                    res.json({
                        success: true,
                        user: authObj
                    });
                    return;
                }
                else {
                    // response is OutgoingMessage object that server response http request
                    res.json({ success: false, message: 'Passwords do not match' });
                }
            });
        } else {
            res.json({
                success: false,
                message: 'Authentication failed.  Login Unsuccessful'
            });
        }
    });
});

router.post('/update-password', function (req, res) {
    if (!req.body.email || !req.body.contact || !req.body.password) {
        res.json({
            success: false,
            message: 'Data not sufficient'
        });
    }
    User.findOne({
        email: req.body.email,
        contact: req.body.contact
    }, function (err, loginData) {
        if (err) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
        }
        if (loginData) {

            let salt = bcrypt.genSaltSync(10);
            let password = md5(req.body.password)
            let finalPassWord = bcrypt.hashSync(password, salt);
            User.findByIdAndUpdate(loginData._id, { password: finalPassWord }, function (err, updateData) {
                if (updateData) {
                    res.json({
                        success: true,
                        message: 'Password Updated Successfully'
                    });
                }
            });
            return;
        }
        res.json({
            success: false,
            message: 'Invalid User Credentials, Please Recheck Contact Info.'
        });
    });
});

router.post('/forget-password', function (req, res) {
    if (!req.body.email) {
        res.json({
            success: false,
            message: 'Data not sufficient'
        });
    }
    User.findOne({
        email: req.body.email
    }, function (err, loginData) {
        if (err) {
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send(err);
        }
        if (loginData) {
            let split = loginData.contact.split('');
            let contactLength = split.length;

            let contact = {
                "1": split[1],
                "4": split[4],
                "-2": split[contactLength - 2],
                "-3": split[contactLength - 3],
                "-1": split[contactLength - 1],
            }
            res.json({
                success: true,
                user: {
                    email: loginData.email,
                    contact: contact,
                    length: contactLength
                }
            });
        } else {
            res.json({
                success: false,
                message: 'Email Not found'
            });
        }
    });
});

module.exports = router;