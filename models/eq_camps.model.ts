import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_camps extends Document{
    _id: ObjectId,
    country_id: ObjectId,
    region_id: ObjectId,
    province_id: ObjectId,
    city_id: ObjectId,
    area_id: ObjectId,
    camp_type: String,
    landlord_id: ObjectId | null,
    realestate_id: ObjectId | null,
    client_company_id: ObjectId | null,
    headoffice_id: ObjectId,
    camp_name: String,
    camp_capacity: String,
    camp_occupancy: Number,
    is_active: Boolean,
    is_eq_added: Boolean,
    createdAt: Date,
    updatedAt: Date
}

const Eq_campsSchema: Schema = new Schema({
    country_id: {type: Schema.Types.ObjectId, ref: "eq_countries"},
    region_id: {type: Schema.Types.ObjectId, ref: "eq_region"},
    province_id: {type:Schema.Types.ObjectId, ref: "eq_province"},
    city_id: {type: Schema.Types.ObjectId, ref: "eq_city"},
    area_id: {type: Schema.Types.ObjectId, ref: "eq_area"},
    landlord_id: {type: Schema.Types.ObjectId, ref: "eq_camp_landlord"},
    realestate_id: {type:Schema.Types.ObjectId, ref: "eq_camp_realestate"},
    client_company_id: {type:Schema.Types.ObjectId, ref: "eq_camp_client_company"},
    headoffice_id: {type: Schema.Types.ObjectId, ref: "eq_camp_headoffice"},
    camp_type: {type:String},
    camp_name: {type: String},
    camp_capacity: {type: String},
    camp_occupancy: {type: Number},
    is_active: {type: Boolean, default: false},
    is_eq_added: {type: Boolean},
}, {timestamps: true});

const Eq_camps = mongoose.models?.eq_camps || mongoose.model<IEq_camps>("eq_camps", Eq_campsSchema);

export default Eq_camps;