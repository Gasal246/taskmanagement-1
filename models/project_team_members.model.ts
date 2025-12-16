import mongoose, { ObjectId, Schema } from "mongoose";

interface IProject_Team_Members extends Document {
    _id: ObjectId,
    project_team_id: ObjectId,
    user_id: ObjectId,
    createdAt: Date,
    updatedAt: Date
}

const Project_Team_MembersSchema: Schema = new Schema({
    project_team_id: {type: Schema.Types.ObjectId, ref: "project_teams", required: true},
    user_id: {type: Schema.Types.ObjectId, ref: "users", required: true}
}, { timestamps: true });

const Project_Team_Members = mongoose.models?.Project_Team_Members || mongoose.model<IProject_Team_Members>('Project_Team_Members', Project_Team_MembersSchema);

export default Project_Team_Members;