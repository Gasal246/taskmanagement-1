import mongoose, { Document, Types, Schema } from "mongoose";

interface IProject_Team_Members extends Document {
    _id: Types.ObjectId,
    project_team_id: Types.ObjectId,
    user_id: Types.ObjectId,
    createdAt: Date,
    updatedAt: Date
}

const Project_Team_MembersSchema: Schema = new Schema({
    project_team_id: {type: Schema.Types.ObjectId, ref: "project_teams", required: true},
    user_id: {type: Schema.Types.ObjectId, ref: "users", required: true}
}, { timestamps: true });

Project_Team_MembersSchema.index({ user_id: 1, project_team_id: 1 });
Project_Team_MembersSchema.index({ project_team_id: 1, user_id: 1 });

const Project_Team_Members = mongoose.models?.Project_Team_Members || mongoose.model<IProject_Team_Members>('Project_Team_Members', Project_Team_MembersSchema);

export default Project_Team_Members;