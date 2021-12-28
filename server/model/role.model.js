var mongoose=require('mongoose');
var Schema=mongoose.Schema;
var objectId=mongoose.Schema.Types.ObjectId;
var roleSchema=new Schema({
    _id:{type:objectId,auto:true},
    name:{type:String ,required:true}
},{
    versionKey:false
});
const role=mongoose.model('roles',roleSchema);
module.exports=role;