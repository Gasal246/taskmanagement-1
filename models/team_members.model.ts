import mongoose, { Document, Types, Schema } from "mongoose";


interface ITeam_Members extends Document{
    _id: Types.ObjectId,
    team_id: Types.ObjectId,
    user_id: Types.ObjectId,
    createdAt: Date,
    updatedAt: Date
}

const TeamMembersSchema: Schema = new Schema({
    team_id: {type: Schema.Types.ObjectId, ref: "teams", required: true},
    user_id: {type: Schema.Types.ObjectId, ref: "users", required: true}
}, { timestamps: true });

TeamMembersSchema.index({ user_id: 1, team_id: 1 });

const Team_Members = mongoose.models?.Team_Members || mongoose.model<ITeam_Members>('Team_Members', TeamMembersSchema);

export default Team_Members;
