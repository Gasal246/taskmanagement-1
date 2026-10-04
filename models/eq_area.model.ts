import mongoose, { Document, Types, Schema } from "mongoose";

export interface IEq_Area extends Document{
    _id: Types.ObjectId,
    business_id?: Types.ObjectId,
    country_id: Types.ObjectId,
    province_id: Types.ObjectId,
    region_id: Types.ObjectId,
    city_id: Types.ObjectId,
    area_name: String,
    is_active: Boolean,
    createdAt: Date,
    updatedAt: Date
}

const Eq_AreaSchema:Schema = new Schema({
    business_id: { type: Schema.Types.ObjectId, ref: "business", immutable: true },
    country_id: {type: Schema.Types.ObjectId, ref: "eq_countries"},
    region_id: {type:Schema.Types.ObjectId, ref: "eq_region"},
    province_id: {type:Schema.Types.ObjectId, ref: "eq_province"},
    city_id: {type: Schema.Types.ObjectId, ref: "eq_city"},
    area_name: {type: String},
    is_active: {type: Boolean}
}, {timestamps:true});

const Eq_area = mongoose.models?.eq_area || mongoose.model<IEq_Area>("eq_area", Eq_AreaSchema);

export default Eq_area;