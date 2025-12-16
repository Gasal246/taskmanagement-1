import mongoose, { ObjectId, Schema } from "mongoose";


interface IFlow_Log extends Document {
    _id: ObjectId,
    user_id: ObjectId,
    Log: String,
    description: String | null,
    task_id: ObjectId | null,
    project_id: ObjectId | null,
    activity_id: ObjectId | null,
    createdAt: Date,
    updatedAt: Date
}

const FlowLogSchema: Schema = new Schema({
    user_id: {type: Schema.Types.ObjectId, ref: "users", required: true},
    Log: {type: String, required: true},
    description: {type: String, default: null},
    task_id: {type: Schema.Types.ObjectId, ref: "business_tasks", default: null},
    project_id: {type: Schema.Types.ObjectId, ref: "business_projects", default: null, required: false},
    activity_id: {type: Schema.Types.ObjectId, ref: "business_activities", default: null}
}, { timestamps: true });

const Flow_Log = mongoose.models?.Flow_Log || mongoose.model<IFlow_Log>('Flow_Log', FlowLogSchema);

export default Flow_Log;