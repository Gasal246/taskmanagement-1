import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_Countries extends Document{
    _id: ObjectId,
    country_name: String,
    createdAt: Date,
    updatedAt: Date
}

const Eq_CountriesSchema : Schema = new Schema({
    country_name: {type: String}
}, {timestamps: true})

const Eq_Countries = mongoose.models?.eq_countries || mongoose.model<IEq_Countries>("eq_countries", Eq_CountriesSchema);

export default Eq_Countries;