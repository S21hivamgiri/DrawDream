var express = require('express');
var httpStatus = require('http-status-codes');
var router = express.Router();
const User = require('../model/user.model');

router.route('/').get((req, res) => {
    User.find({}).then(docs => {
        res.send(docs);
    }).catch((err) => {
        res.status(httpStatus.StatusCodes.INTERNAL_SERVER_ERROR).send(err);
    });
});

router.route('/:id').get((req, res) => {
    let id = req.params.id;
    User.findById(id).then(docs => {
        res.status(httpStatus.StatusCodes.OK).send(docs);
    }).catch(err => {
        res.status(httpStatus.StatusCodes.INTERNAL_SERVER_ERROR).send(err);
    });
});

router.put('/edit/:id', (req, res) => {
    let id = req.params.id;
    const obj = req.body;
    User.findByIdAndUpdate(id, { lastName: obj.lastName, email: obj.email, country: obj.country, code: obj.code, user: obj.user, address: obj.address, emergency: obj.emergency }, (err, doc) => {
        if (err) {
            res.status(httpStatus.StatusCodes.INTERNAL_SERVER_ERROR).send(err);
        } else
            res.status(httpStatus.StatusCodes.OK).send(doc);
    });
});


module.exports = router;