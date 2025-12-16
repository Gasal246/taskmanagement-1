import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_camp_realestate extends Document{
    _id: ObjectId,
    company_name: String,
    createdAt: Date,
    updatedAt: Date
};

const Eq_camp_realestateSchema:Schema = new Schema({
    company_name: {type:String}
}, {timestamps: true});

const Eq_camp_realestate = mongoose.models?.eq_camp_realestate || mongoose.model<IEq_camp_realestate>("eq_camp_realestate", Eq_camp_realestateSchema);

export default Eq_camp_realestate;