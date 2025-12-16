import mongoose, { ObjectId, Schema } from "mongoose";

interface ITask_Activities extends Document{
    _id: ObjectId,
    activity: String,
    description: String,
    is_done: Boolean,
    project_id: ObjectId | null,
    task_id: ObjectId,
    completed_in: Number | null,
    createdAt: Date,
    updatedAt: Date
}

const Task_ActivitiesSchema: Schema = new Schema({
    activity: {type: String},
    description: {type: String},
    is_done: {type: Boolean},
    project_id: {type: Schema.Types.ObjectId, ref:"business_project"},
    task_id: {type: Schema.Types.ObjectId, ref: "business_tasks"},
    completed_in: {type: Number, default: null},
}, {timestamps:true})

const Task_Activities = mongoose.models?.task_activities || mongoose.model<ITask_Activities>("task_activities", Task_ActivitiesSchema);
export default Task_Activities;