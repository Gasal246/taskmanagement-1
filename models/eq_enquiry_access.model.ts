import mongoose, { Document, Types, Schema } from "mongoose";

export interface IEq_enquiry_access extends Document {
    _id: Types.ObjectId,
    history_id: Types.ObjectId,
    enquiry_id: Types.ObjectId,
    camp_id: Types.ObjectId,
    user_id: Types.ObjectId,
    createdAt: Date,
    updatedAt: Date
}

const Eq_enquiry_accessSchema: Schema = new Schema({
    history_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry_histories"},
    enquiry_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry"},
    camp_id: {type: Schema.Types.ObjectId, ref: "eq_camps"},
    user_id: {type: Schema.Types.ObjectId, ref: "users"}
}, {timestamps: true});

Eq_enquiry_accessSchema.index({ enquiry_id: 1, user_id: 1 });
Eq_enquiry_accessSchema.index({ user_id: 1, enquiry_id: 1 });
Eq_enquiry_accessSchema.index({ history_id: 1, enquiry_id: 1, user_id: 1 });

const Eq_enquiry_access = mongoose.models?.eq_enquiry_access || mongoose.model<IEq_enquiry_access>("eq_enquiry_access", Eq_enquiry_accessSchema);

export default Eq_enquiry_access;