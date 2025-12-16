import mongoose, { Date, ObjectId, Schema } from "mongoose";

export interface IEq_users_log extends Document{
    _id: ObjectId,
    user_id: ObjectId | null,
    camp_id: ObjectId | null,
    enquiry_id: ObjectId | null,
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

const Eq_users_log = mongoose.models?.eq_users_log || mongoose.model<IEq_users_log>("eq_users_log", Eq_users_logSchema);

export default Eq_users_log;