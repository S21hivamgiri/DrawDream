var express = require('express');
var router = express.Router();

var Role = require('../model/role.model');

router.route('/').get((req, res) => {
    Role.find({}).then(docs => {
        res.send(docs);
    }).catch(err => {
        res.status(httpStatus.StatusCodes.INTERNAL_SERVER_ERROR).send(err);
    });
});


router.post('/', function(req, res) {
    const obj = req.body;
    Role.create(obj).then(docs => {
        res.status(201).send("Role for " + docs.name + " created sucessfully.");
    });
});

module.exports = router;