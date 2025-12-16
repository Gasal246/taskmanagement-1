import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_camp_landlord extends Document{
    _id: ObjectId,
    landlord_name: String,
    createdAt: Date,
    updatedAt: Date
}

const eq_landlordSchema: Schema = new Schema({
    landlord_name: {type:String}
}, {timestamps: true});

const Eq_camp_landlord = mongoose.models?.eq_camp_landlord || mongoose.model<IEq_camp_landlord>("eq_camp_landlord", eq_landlordSchema);

export default Eq_camp_landlord;