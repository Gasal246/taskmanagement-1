import mongoose, { Document, Decimal128, Types, Schema } from "mongoose";

export interface IEq_enquiries extends Document{
    _id: Types.ObjectId,
    business_id?: Types.ObjectId,
    country_id: Types.ObjectId,
    region_id: Types.ObjectId,
    province_id: Types.ObjectId,
    city_id: Types.ObjectId,
    area_id: Types.ObjectId,
    camp_id: Types.ObjectId,
    createdBy: Types.ObjectId,
    enquiry_uuid: String,
    is_active: Boolean,
    status: String,
    priority: String,
    alert_date: Date,
    due_date: Date,
    wifi_type: String,
    expected_wifi_cost: Decimal128,
    lease_expiry_due: Date,
    competition_status: Boolean,
    competition_notes: String,
    next_action: String,
    next_action_due: Date,
    comments: String,
    rent_terms: String,
    wifi_available: Boolean,
    latitude: String,
    longitude: String,
    is_edit_req: Boolean,
    wifi_setup: String,
    is_converted: Boolean,
    enquiry_brought_by: Types.ObjectId[],
    meeting_initiated_by: Types.ObjectId[],
    project_closed_by: Types.ObjectId[],
    project_managed_by: Types.ObjectId[],
    enquiry_user_notes: String,
    is_completed: boolean,
    completed_at?: Date,
    completed_by?: Types.ObjectId,
    completion_action?: string,
    completion_notes?: string,
    completion_source?: string,
    completion_forward_id?: Types.ObjectId,
    completion_date_estimated?: boolean,
    createdAt: Date,
    updatedAt: Date
}

const Eq_enquiriesSchema:Schema = new Schema({
    business_id: { type: Schema.Types.ObjectId, ref: "business", immutable: true },
    is_completed: { type: Boolean, default: false },
    completed_at: { type: Date },
    completed_by: { type: Schema.Types.ObjectId, ref: "users" },
    completion_action: { type: String },
    completion_notes: { type: String },
    completion_source: { type: String, enum: ["manual", "awarded", "converted", "legacy"] },
    completion_forward_id: { type: Schema.Types.ObjectId, ref: "eq_enquiry_histories" },
    completion_date_estimated: { type: Boolean, default: false },
    country_id: {type: Schema.Types.ObjectId, ref:"eq_countries"},
    region_id: {type: Schema.Types.ObjectId, ref: "eq_region"},
    province_id: {type: Schema.Types.ObjectId, ref: "eq_province"},
    city_id: {type: Schema.Types.ObjectId, ref: "eq_city"},
    area_id: {type: Schema.Types.ObjectId, ref: "eq_area"},
    camp_id: {type: Schema.Types.ObjectId, ref: "eq_camps"},
    createdBy: {type: Schema.Types.ObjectId, ref: "users"},
    enquiry_uuid: {type: String},
    is_active: {type:Boolean, default: false},
    status: {type: String},
    priority: {type: String},
    alert_date: {type: Date},
    due_date: {type: Date},
    wifi_type: {type: String},
    expected_wifi_cost: {type: Schema.Types.Decimal128},
    lease_expiry_due: {type:Date},
    competition_status: {type:Boolean},
    competition_notes: {type: String},
    next_action: {type: String},
    next_action_due: {type: Date},
    comments: {type: String},
    rent_terms: {type: String},
    wifi_available: {type:Boolean},
    latitude: {type: String},
    longitude: {type: String},
    is_edit_req: {type: Boolean},
    wifi_setup: {type: String},
    is_converted: {type: Boolean, default: false},
    converted_project_id: { type: Schema.Types.ObjectId, ref: "business_project" },
    enquiry_brought_by: { type: [Schema.Types.ObjectId], ref: "users", default: [] },
    meeting_initiated_by: { type: [Schema.Types.ObjectId], ref: "users", default: [] },
    project_closed_by: { type: [Schema.Types.ObjectId], ref: "users", default: [] },
    project_managed_by: { type: [Schema.Types.ObjectId], ref: "users", default: [] },
    enquiry_user_notes: { type: String }
}, {timestamps: true});

// Refresh the cached development model when this additive schema is hot-reloaded.
if (mongoose.models.eq_enquiry && (!mongoose.models.eq_enquiry.schema.path("completed_at") || !mongoose.models.eq_enquiry.schema.path("business_id"))) {
    mongoose.deleteModel("eq_enquiry");
}

// Actual list ordering, approval filtering, staff ownership and identity checks.
Eq_enquiriesSchema.index({ business_id: 1, createdAt: -1, _id: -1 });
Eq_enquiriesSchema.index({ business_id: 1, is_active: 1, createdAt: -1, _id: -1 });
Eq_enquiriesSchema.index({ createdAt: -1, _id: -1 });
Eq_enquiriesSchema.index({ is_active: 1, createdAt: -1, _id: -1 });
Eq_enquiriesSchema.index({ createdBy: 1, createdAt: -1, _id: -1 });
Eq_enquiriesSchema.index({ camp_id: 1 });
Eq_enquiriesSchema.index({ enquiry_uuid: 1 });

const Eq_enquiry = mongoose.models?.eq_enquiry || mongoose.model<IEq_enquiries>("eq_enquiry", Eq_enquiriesSchema);

export default Eq_enquiry;
