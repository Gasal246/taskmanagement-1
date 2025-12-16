import mongoose, { ObjectId, Schema } from "mongoose";

interface IProject_Departments extends Document {
    _id: ObjectId,
    project_id: ObjectId,
    department_id: ObjectId,
    department_name: string,
    is_active: boolean,
    createdAt: Date,
    updatedAt: Date
}

const Project_DepartmentsSchema: Schema = new Schema({
    project_id: {type: Schema.Types.ObjectId, ref: "business_projects", required: true},
    department_id: {type: Schema.Types.ObjectId, ref: "departments", required: true},
    department_name: {type: String, required: true},
    is_active: {type: Boolean, default: false}
}, { timestamps: true });

const Project_Departments = mongoose.models?.project_departments || mongoose.model<IProject_Departments>('project_departments', Project_DepartmentsSchema);
export default Project_Departments;