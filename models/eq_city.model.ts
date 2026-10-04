import mongoose, { Document, Types, Schema } from "mongoose";

export interface IEq_city extends Document{
    _id: Types.ObjectId,
    country_id: Types.ObjectId,
    region_id: Types.ObjectId,
    province_id: Types.ObjectId,
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