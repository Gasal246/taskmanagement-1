import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_enquiry_access extends Document {
    _id: ObjectId,
    history_id: ObjectId,
    enquiry_id: ObjectId,
    camp_id: ObjectId,
    user_id: ObjectId,
    createdAt: Date,
    updatedAt: Date
}

const Eq_enquiry_accessSchema: Schema = new Schema({
    history_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry_histories"},
    enquiry_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry"},
    camp_id: {type: Schema.Types.ObjectId, ref: "eq_camps"},
    user_id: {type: Schema.Types.ObjectId, ref: "users"}
}, {timestamps: true});

const Eq_enquiry_access = mongoose.models?.eq_enquiry_access || mongoose.model<IEq_enquiry_access>("eq_enquiry_access", Eq_enquiry_accessSchema);

export default Eq_enquiry_access;