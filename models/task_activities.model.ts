import mongoose, { ObjectId, Schema } from "mongoose";

interface ITask_Activities extends Document{
    _id: ObjectId,
    activity: String,
    description: String,
    is_done: Boolean,
    created_by: ObjectId | null,
    assigned_to: ObjectId | null,
    forwarded_to: ObjectId | null,
    reassignment_history: Array<{
        action: "reassigned",
        actor_id: ObjectId,
        recipient_id: ObjectId,
        previous_recipient_id: ObjectId | null,
        createdAt: Date,
    }>,
    assigned_skill: ObjectId | null,
    project_id: ObjectId | null,
    task_id: ObjectId,
    completed_in: Number | null,
    createdAt: Date,
    updatedAt: Date
}

const ReassignmentHistorySchema: Schema = new Schema({
    action: { type: String, enum: ["reassigned"], required: true },
    actor_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    recipient_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    previous_recipient_id: { type: Schema.Types.ObjectId, ref: "users", default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

const Task_ActivitiesSchema: Schema = new Schema({
    activity: {type: String},
    description: {type: String},
    is_done: {type: Boolean},
    created_by: {type: Schema.Types.ObjectId, ref: "users", default: null},
    assigned_to: {type: Schema.Types.ObjectId, ref: "users", default: null},
    forwarded_to: {type: Schema.Types.ObjectId, ref: "users", default: null},
    reassignment_history: { type: [ReassignmentHistorySchema], default: [] },
    assigned_skill: {type: Schema.Types.ObjectId, ref: "business_skills", default: null},
    project_id: {type: Schema.Types.ObjectId, ref:"business_project"},
    task_id: {type: Schema.Types.ObjectId, ref: "business_tasks"},
    completed_in: {type: Number, default: null},
}, {timestamps:true})

const Task_Activities = mongoose.models?.task_activities || mongoose.model<ITask_Activities>("task_activities", Task_ActivitiesSchema);
export default Task_Activities;
