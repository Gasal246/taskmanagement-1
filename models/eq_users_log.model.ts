import mongoose, { Document, Date, Types, Schema } from "mongoose";

export interface IEq_users_log extends Document{
    _id: Types.ObjectId,
    user_id: Types.ObjectId | null,
    camp_id: Types.ObjectId | null,
    enquiry_id: Types.ObjectId | null,
    log: String,
    createdAt: Date,
    updatedAt: Date
};

const Eq_users_logSchema: Schema = new Schema ({
    user_id: {type: Schema.Types.ObjectId, ref: "users"},
    camp_id: {type: Schema.Types.ObjectId, ref: "eq_camps"},
    enquiry_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry"},
    log: {type: String}
}, {timestamps: true});

Eq_users_logSchema.index({ user_id: 1, createdAt: -1 });

const Eq_users_log = mongoose.models?.eq_users_log || mongoose.model<IEq_users_log>("eq_users_log", Eq_users_logSchema);

export default Eq_users_log;