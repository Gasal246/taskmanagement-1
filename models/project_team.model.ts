import mongoose, { Document, Types, Schema } from "mongoose";


interface IProject_Teams extends Document {
    _id: Types.ObjectId,
    team_name: string,
    project_id: Types.ObjectId,
    project_dept_id: Types.ObjectId,
    department_id: Types.ObjectId,
    team_head: Types.ObjectId,
    members_count: Number,
    createdAt: Date,
    updatedAt: Date
}

const Project_TeamsSchema: Schema = new Schema({
    team_name: {type: String, required: true},
    project_id: {type: Schema.Types.ObjectId, ref: "business_projects", required: true},
    project_dept_id: {type: Schema.Types.ObjectId, ref: "project_departments", required: true},
    department_id: {type: Schema.Types.ObjectId },
    team_head: {type: Schema.Types.ObjectId, ref: "users"},
    members_count: {type: Number}
}, { timestamps: true });

Project_TeamsSchema.index({ team_head: 1, _id: 1 });
Project_TeamsSchema.index({ project_id: 1 });

const Project_Teams = mongoose.models?.project_teams || mongoose.model<IProject_Teams>('project_teams', Project_TeamsSchema);

export default Project_Teams;
