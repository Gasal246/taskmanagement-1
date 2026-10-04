import mongoose, { Document, Types, Schema } from "mongoose";
import { CAMP_VISITED_STATUS_VALUES } from "@/lib/enquiries/camp-visited-status";
import { mapPoint } from "@/lib/maps/coordinates.mjs";

export interface IEq_camps extends Document{
    _id: Types.ObjectId,
    business_id?: Types.ObjectId,
    country_id: Types.ObjectId,
    region_id: Types.ObjectId,
    province_id: Types.ObjectId,
    city_id: Types.ObjectId,
    area_id: Types.ObjectId,
    camp_type: String,
    project_sector?: string,
    facility_type?: string,
    facility_type_other?: string,
    facility_type_detail?: string,
    sector_field_values?: Array<{ field_key: string; text_value?: string; option_key?: string }>,
    hotel_classification?: string,
    capacity_unit?: string,
    project_stage?: string,
    ownership?: string,
    landlord_id: Types.ObjectId | null,
    realestate_id: Types.ObjectId | null,
    client_company_id: Types.ObjectId | null,
    headoffice_id: Types.ObjectId,
    camp_name: String,
    camp_capacity: String,
    camp_occupancy: Number,
    is_active: Boolean,
    is_eq_added: Boolean,
    visited_status: String,
    latitude: String,
    longitude: String,
    map_point?: number[],
    createdAt: Date,
    updatedAt: Date
}

const Eq_campsSchema: Schema = new Schema({
    business_id: { type: Schema.Types.ObjectId, ref: "business", immutable: true },
    country_id: {type: Schema.Types.ObjectId, ref: "eq_countries"},
    region_id: {type: Schema.Types.ObjectId, ref: "eq_region"},
    province_id: {type:Schema.Types.ObjectId, ref: "eq_province"},
    city_id: {type: Schema.Types.ObjectId, ref: "eq_city"},
    area_id: {type: Schema.Types.ObjectId, ref: "eq_area"},
    landlord_id: {type: Schema.Types.ObjectId, ref: "eq_camp_landlord"},
    realestate_id: {type:Schema.Types.ObjectId, ref: "eq_camp_realestate"},
    client_company_id: {type:Schema.Types.ObjectId, ref: "eq_camp_client_company"},
    headoffice_id: {type: Schema.Types.ObjectId, ref: "eq_camp_headoffice"},
    camp_type: {type:String}, // Legacy records; new classifications use stable sector/facility codes.
    project_sector: {type: String},
    facility_type: {type: String},
    facility_type_other: {type: String},
    facility_type_detail: {type: String},
    sector_field_values: [{
        field_key: { type: String, required: true },
        text_value: { type: String },
        option_key: { type: String },
        _id: false,
    }],
    hotel_classification: {type: String},
    capacity_unit: {type: String},
    project_stage: {type: String},
    ownership: {type: String},
    camp_name: {type: String},
    camp_capacity: {type: String},
    camp_occupancy: {type: Number},
    is_active: {type: Boolean, default: false},
    is_eq_added: {type: Boolean},
    visited_status: {type: String, enum: CAMP_VISITED_STATUS_VALUES, default: "Just Added"},
    latitude: {type: String},
    longitude: {type: String},
    map_point: { type: [Number], default: undefined },
}, {timestamps: true});

// All current facility coordinate writers use document.save()/create(). Derive the
// indexed pair from the source fields on every validation, including coordinate clearing.
Eq_campsSchema.pre("validate", function () {
    if (!this.isNew && (!this.isSelected("latitude") || !this.isSelected("longitude"))) {
        if (this.isModified("latitude") || this.isModified("longitude")) throw new Error("Load both facility coordinates before editing them");
        return; // A projected status/name save must not erase an existing map point.
    }
    this.set("map_point", mapPoint(this.get("latitude"), this.get("longitude")));
});
Eq_campsSchema.pre(["updateOne", "updateMany", "findOneAndUpdate"], function () {
    const update: any = this.getUpdate();
    if (Array.isArray(update)) throw new Error("Facility pipeline updates must maintain map coordinates explicitly");
    if ([update, update?.$set, update?.$unset, update?.$rename].some(part => part && ("latitude" in part || "longitude" in part))) {
        throw new Error("Use a loaded facility document.save() to change coordinates");
    }
});
Eq_campsSchema.index({ map_point: "2d" });
Eq_campsSchema.index({ country_id: 1, is_active: 1, region_id: 1, province_id: 1, camp_name: 1, _id: 1 });

if (mongoose.models.eq_camps && !mongoose.models.eq_camps.schema.path("map_point")) mongoose.deleteModel("eq_camps");

const Eq_camps = mongoose.models?.eq_camps || mongoose.model<IEq_camps>("eq_camps", Eq_campsSchema);

export default Eq_camps;
