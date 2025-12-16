import mongoose, { ObjectId, Schema } from "mongoose";
import { object } from "zod";

export interface IEq_enquriy_users extends Document{
    _id: ObjectId,
    user_id: ObjectId,
    business_id: ObjectId,
    addedBy: ObjectId,
    createdAt: Date,
    updatedAt: Date
};

const Eq_enquiry_usersSchema: Schema = new Schema({
    user_id: {type: Schema.Types.ObjectId, ref: "users"},
    business_id: {type: Schema.Types.ObjectId, ref: "businesses"},
    addedBy: {type: Schema.Types.ObjectId, ref: "users"}
},{timestamps:true});

const Eq_enquiry_users = mongoose.models?.eq_enquiry_users || mongoose.model<IEq_enquriy_users>("eq_enquiry_users", Eq_enquiry_usersSchema);

export default Eq_enquiry_users;