import mongoose, { ObjectId, Schema } from "mongoose";


interface IProject_Teams extends Document {
    _id: ObjectId,
    team_name: string,
    project_id: ObjectId,
    project_dept_id: ObjectId,
    department_id: ObjectId,
    team_head: ObjectId,
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

const Project_Teams = mongoose.models?.project_teams || mongoose.model<IProject_Teams>('project_teams', Project_TeamsSchema);

export default Project_Teams;