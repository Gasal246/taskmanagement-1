import mongoose, { ObjectId, Schema } from "mongoose";


export interface IBusiness_Project extends Document {
    _id: ObjectId,
    project_name: String,
    project_description: String | null,
    business_id: ObjectId,
    region_id: ObjectId | null,
    department_id: ObjectId | null,
    area_id: ObjectId | null,
    location_id: ObjectId | null,
    admin_id: ObjectId,
    status: String,
    creator: ObjectId,
    project_head: ObjectId | null,
    project_heads: ObjectId[],
    project_supervisors: ObjectId[],
    approved_by: ObjectId | null,
    client_id: ObjectId | null,
    start_date: Date | null,
    end_date: Date | null,
    priority: String,
    task_count: Number | null,
    completed_task_count: Number | null,
    is_approved: Boolean,
    createdAt: Date,
    updatedAt: Date,
    type: String
}

const ProjectsSchema: Schema = new Schema({
    project_name: {type: String, required: true},
    project_description: {type: String, default: null},
    business_id: {type: Schema.Types.ObjectId, ref: "businesses", required: true},
    region_id: {type: Schema.Types.ObjectId, ref: "business_regions"},
    department_id: {type: Schema.Types.ObjectId, ref: "business_departments"},
    status: {type: String, default: "pending", enum: ["pending", "approved", "completed", "cancelled"]},
    creator: {type: Schema.Types.ObjectId, ref: "users", required: true},
    project_head: {type: Schema.Types.ObjectId, ref: "users", default: null},
    project_heads: {type: [{type: Schema.Types.ObjectId, ref: "users"}], default: []},
    project_supervisors: {type: [{type: Schema.Types.ObjectId, ref: "users"}], default: []},
    approved_by: {type: Schema.Types.ObjectId, ref: "users"},
    client_id: {type: Schema.Types.ObjectId, ref: "business_clients"},
    start_date: {type: Date, default: null},
    end_date: {type: Date, default: null},
    area_id: {type: Schema.Types.ObjectId, ref: "business_areas"},
    location_id: {type: Schema.Types.ObjectId, ref: "business_locations"},
    task_count: {type: Number, default: 0},
    completed_task_count: {type: Number, default: 0},
    is_approved: { type: Boolean, default: false },
    priority: { type: String, default: "normal", enum: ["low", "normal", "high"] },
    admin_id: { type: Schema.Types.ObjectId, ref: "users", required: false },
    type: { type: String, default: "general", enum: ["sales", "marketing", "it", "finance", "hr", "operations", "customer-support", "legal", "rnd", "product-management", "procurement", "other"] }
}, { timestamps: true });

const Business_Project = mongoose.models?.business_project || mongoose.model<IBusiness_Project>('business_project', ProjectsSchema);

export default Business_Project;
