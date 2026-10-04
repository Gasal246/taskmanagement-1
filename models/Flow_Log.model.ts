import mongoose, { Document, Types, Schema } from "mongoose";


interface IFlow_Log extends Document {
    _id: Types.ObjectId,
    user_id: Types.ObjectId,
    Log: String,
    description: String | null,
    task_id: Types.ObjectId | null,
    project_id: Types.ObjectId | null,
    activity_id: Types.ObjectId | null,
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