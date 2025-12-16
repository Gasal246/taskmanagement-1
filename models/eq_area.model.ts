import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_Area extends Document{
    _id: ObjectId,
    country_id: ObjectId,
    province_id: ObjectId,
    region_id: ObjectId,
    city_id: ObjectId,
    area_name: String,
    is_active: Boolean,
    createdAt: Date,
    updatedAt: Date
}

const Eq_AreaSchema:Schema = new Schema({
    country_id: {type: Schema.Types.ObjectId, ref: "eq_countries"},
    region_id: {type:Schema.Types.ObjectId, ref: "eq_region"},
    province_id: {type:Schema.Types.ObjectId, ref: "eq_province"},
    city_id: {type: Schema.Types.ObjectId, ref: "eq_city"},
    area_name: {type: String},
    is_active: {type: Boolean}
}, {timestamps:true});

const Eq_area = mongoose.models?.eq_area || mongoose.model<IEq_Area>("eq_area", Eq_AreaSchema);

export default Eq_area;