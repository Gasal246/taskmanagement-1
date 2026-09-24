import { SCHEDULE_ACTIONS, type ScheduleHistoryEntry } from "@/lib/activity-deadline";
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
    schedule_history: ScheduleHistoryEntry[],
    assigned_skill: ObjectId | null,
    project_id: ObjectId | null,
    task_id: ObjectId,
    start_date: Date | null,
    end_date: Date | null,
    completed_in: Number | null,
    documents: Array<{ url: string, storagePath: string, name: string, mimeType: string, extension: string, size: number }>,
    createdAt: Date,
    updatedAt: Date
}

const ReassignmentHistorySchema: Schema = new Schema({
    action: { type: String, enum: ["reassigned"], required: true },
    actor_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    recipient_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    previous_recipient_id: { type: Schema.Types.ObjectId, ref: "users", default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

const ScheduleHistorySchema = new Schema({
    action: { type: String, enum: [...SCHEDULE_ACTIONS], required: true },
    actor_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    actor_name: { type: String, required: true },
    previous_start_date: { type: Date, default: null },
    previous_end_date: { type: Date, default: null },
    new_start_date: { type: Date, required: true },
    new_end_date: { type: Date, required: true },
    createdAt: { type: Date, required: true },
});

const Task_ActivitiesSchema: Schema = new Schema({
    activity: {type: String},
    description: {type: String},
    is_done: {type: Boolean},
    created_by: {type: Schema.Types.ObjectId, ref: "users", default: null},
    assigned_to: {type: Schema.Types.ObjectId, ref: "users", default: null},
    forwarded_to: {type: Schema.Types.ObjectId, ref: "users", default: null},
    reassignment_history: { type: [ReassignmentHistorySchema], default: [] },
    schedule_history: { type: [ScheduleHistorySchema], default: [] },
    assigned_skill: {type: Schema.Types.ObjectId, ref: "business_skills", default: null},
    project_id: {type: Schema.Types.ObjectId, ref:"business_project"},
    task_id: {type: Schema.Types.ObjectId, ref: "business_tasks"},
    start_date: {type: Date, default: null},
    end_date: {type: Date, default: null},
    completed_in: {type: Number, default: null},
    documents: { type: [{
        url: { type: String, required: true }, storagePath: { type: String, required: true },
        name: { type: String, required: true }, mimeType: { type: String, required: true },
        extension: { type: String, required: true }, size: { type: Number, required: true },
    }], default: [] },
}, {timestamps:true})

Task_ActivitiesSchema.index({ assigned_to: 1, task_id: 1 });
Task_ActivitiesSchema.index({ forwarded_to: 1, task_id: 1 });
Task_ActivitiesSchema.index({ task_id: 1, createdAt: 1, _id: 1 });

const Task_Activities = mongoose.models?.task_activities || mongoose.model<ITask_Activities>("task_activities", Task_ActivitiesSchema);
export default Task_Activities;
