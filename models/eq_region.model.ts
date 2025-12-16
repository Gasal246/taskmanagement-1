import { timeStamp } from "console";
import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_region extends Document{
    _id: ObjectId,
    region_name: String,
    country_id: ObjectId,
    createdAt: Date,
    updatedAt: Date
}

const Eq_regionSchema: Schema = new Schema({
    region_name: {type: String},
    country_id: {type: Schema.Types.ObjectId, ref: "eq_countries"}
}, {timestamps: true});

const Eq_region = mongoose.models?.eq_region || mongoose.model<IEq_region>("eq_region", Eq_regionSchema);

export default Eq_region;