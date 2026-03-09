import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_enquiry_histories extends Document {
    _id: ObjectId,
    camp_id: ObjectId,
    enquiry_id: ObjectId,
    assigned_to: ObjectId[],
    forwarded_by?: ObjectId,
    changed_by?: ObjectId,
    change_type?: String,
    changed_fields?: Array<{
        field: String,
        label: String,
        from_value: unknown,
        to_value: unknown
    }>,
    step_number: Number,
    priority: Number,
    is_finished: Boolean,
    action: String,
    feedback: String,
    next_step_date: Date,
    createdAt: Date,
    updatedAt: Date
}

const Eq_enquiry_historiesSchema: Schema = new Schema({
    camp_id: {type:Schema.Types.ObjectId, ref: "eq_camps"},
    enquiry_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry"},
    assigned_to: { type: [Schema.Types.ObjectId], ref: "users", default: [] },
    forwarded_by: {type: Schema.Types.ObjectId, ref: "users"},
    changed_by: {type: Schema.Types.ObjectId, ref: "users"},
    change_type: {type: String, enum: ["FORWARD", "ENQUIRY_EDIT"], default: "FORWARD"},
    changed_fields: [{
        field: { type: String },
        label: { type: String },
        from_value: { type: Schema.Types.Mixed },
        to_value: { type: Schema.Types.Mixed },
    }],
    step_number: {type: Number},
    priority: {type: Number},
    is_finished: {type: Boolean},
    action: {type: String},
    feedback: {type: String},
    next_step_date: {type: Date}
}, {timestamps: true});

const Eq_enquiry_histories = mongoose.models?.eq_enquiry_histories || mongoose.model<IEq_enquiry_histories>("eq_enquiry_histories", Eq_enquiry_historiesSchema);

export default Eq_enquiry_histories;
