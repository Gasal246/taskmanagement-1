import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_city extends Document{
    _id: ObjectId,
    country_id: ObjectId,
    region_id: ObjectId,
    province_id: ObjectId,
    city_name: String,
    createdAt: Date,
    updatedAt: Date
};

const Eq_citySchema: Schema = new Schema({
    country_id: {type: Schema.Types.ObjectId, ref: "eq_countries"},
    region_id: {type: Schema.Types.ObjectId, ref: "eq_region"},
    province_id: {type: Schema.Types.ObjectId, ref: "eq_province"},
    city_name: {type: String}
}, {timestamps: true});

const Eq_city = mongoose.models?.eq_city || mongoose.model<IEq_city>("eq_city", Eq_citySchema);

export default Eq_city;