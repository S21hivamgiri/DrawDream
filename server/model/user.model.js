var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var objectId = mongoose.Schema.Types.ObjectId;
var userSchema = new Schema({
    _id: { type: objectId, auto: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: false },
    contact: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    country: { type: String, required: true },
    loginTime: { type: Date, required: true },
    playlist: { type: Array, required: true },
    initials: { type: String, required: true },
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'roles'
    }]
}, {
    versionKey: false
});
const user = mongoose.model('users', userSchema);
module.exports = user;