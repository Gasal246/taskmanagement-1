import mongoose, { ObjectId, Schema } from "mongoose";

interface IBusiness_Tasks extends Document {
    _id: ObjectId,
    project_id: ObjectId | null,
    assigned_teams: ObjectId | null,
    assigned_to: ObjectId | null,
    business_id: ObjectId | null,
    creator: ObjectId,
    task_name: String,
    task_description: String,
    is_project_task: Boolean,
    start_date: Date,
    end_date: Date,
    activity_count: Number,
    completed_activity: Number,
    status: String,
    createdAt: Date,
    updatedAt: Date
}

const Business_TasksSchema:Schema = new Schema({
    project_id: {type: Schema.Types.ObjectId, ref:"business_project"},
    assigned_teams: {type: Schema.Types.ObjectId, ref: "project_teams", required: false},
    assigned_to: {type: Schema.Types.ObjectId, ref:"users"},
    business_id: {type: Schema.Types.ObjectId, ref: "businesses", required: true},
    creator: {type: Schema.Types.ObjectId, ref: "users"},
    task_name: {type: String},
    task_description: {type: String},
    is_project_task: {type:Boolean},
    start_date: {type: Date, default: null},
    end_date: {type: Date, default: null},
    activity_count: {type: Number, default: 0},
    completed_activity: {type: Number, default:0},
    status: {type: String, enum: ["To Do", "Completed", "In Progress", "Cancelled"]}
}, {timestamps: true});

const Business_Tasks = mongoose.models?.business_tasks || mongoose.model<IBusiness_Tasks>('business_tasks', Business_TasksSchema);

export default Business_Tasks;