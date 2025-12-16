import mongoose, { ObjectId, Schema } from "mongoose";


interface ITeam_Members extends Document{
    _id: ObjectId,
    team_id: ObjectId,
    user_id: ObjectId,
    createdAt: Date,
    updatedAt: Date
}

const TeamMembersSchema: Schema = new Schema({
    team_id: {type: Schema.Types.ObjectId, ref: "teams", required: true},
    user_id: {type: Schema.Types.ObjectId, ref: "users", required: true}
}, { timestamps: true });

const Team_Members = mongoose.models?.Team_Members || mongoose.model<ITeam_Members>('Team_Members', TeamMembersSchema);

export default Team_Members;