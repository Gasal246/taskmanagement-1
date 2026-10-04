import mongoose, { Document, Types, Schema } from "mongoose";

export interface IEq_province extends Document{
    _id: Types.ObjectId,
    country_id: Types.ObjectId,
    region_id: Types.ObjectId,
    province_name: String,
    createdAt: Date,
    updatedAt: Date
}

const Eq_provinceSchema: Schema = new Schema({
    country_id: {type: Schema.Types.ObjectId, ref: "eq_countries"},
    region_id: {type: Schema.Types.ObjectId, ref: "eq_region"},
    province_name: {type: String}
}, {timestamps: true});

const Eq_province = mongoose.models?.eq_province || mongoose.model<IEq_province>("eq_province", Eq_provinceSchema);

export default Eq_province;

