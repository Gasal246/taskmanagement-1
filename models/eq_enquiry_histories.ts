import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_enquiry_histories extends Document {
    _id: ObjectId,
    camp_id: ObjectId,
    enquiry_id: ObjectId,
    assigned_to: ObjectId[],
    forwarded_by?: ObjectId,
    changed_by?: ObjectId,
    change_type?: String,
    source_forward_id?: ObjectId,
    previous_action?: String,
    action_origin?: string,
    action_assignments?: any[],
    action_id?: ObjectId,
    action_assignee?: ObjectId,
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
    change_type: {type: String, enum: ["FORWARD", "ENQUIRY_EDIT", "ENQUIRY_COMPLETED", "ENQUIRY_REOPENED", "ACTION_SCHEDULED", "ACTION_COMPLETED", "ACTION_CANCELLED", "ACTION_REOPENED"], default: "FORWARD"},
    action_origin: { type: String, enum: ["initial", "forward", "recorded", "enquiry_edit"] },
    action_assignments: { type: [{
        _id: false,
        user_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
        status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
        revision: { type: Number, default: 0 },
        performed_action: { type: String, enum: ["Call", "Visit"] },
        completion_notes: String,
        completed_at: Date,
        completed_by: { type: Schema.Types.ObjectId, ref: "users" },
        cancelled_at: Date,
        cancelled_by: { type: Schema.Types.ObjectId, ref: "users" },
        cancellation_notes: String,
    }], default: undefined },
    action_id: { type: Schema.Types.ObjectId, ref: "eq_enquiry_histories" },
    action_assignee: { type: Schema.Types.ObjectId, ref: "users" },
    source_forward_id: { type: Schema.Types.ObjectId, ref: "eq_enquiry_histories" },
    previous_action: { type: String },
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

Eq_enquiry_historiesSchema.index({ enquiry_id: 1, step_number: -1, createdAt: -1 });

if (mongoose.models.eq_enquiry_histories && !mongoose.models.eq_enquiry_histories.schema.path("action_assignments")) {
    mongoose.deleteModel("eq_enquiry_histories");
}

const Eq_enquiry_histories = mongoose.models?.eq_enquiry_histories || mongoose.model<IEq_enquiry_histories>("eq_enquiry_histories", Eq_enquiry_historiesSchema);

export default Eq_enquiry_histories;
