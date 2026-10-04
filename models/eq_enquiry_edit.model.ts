import mongoose, { Document, Decimal128, Types, Schema } from "mongoose";

export interface IEq_Enquiry_edit extends Document{
    _id: Types.ObjectId,
    enquiry_id: Types.ObjectId,
    next_action: String,
    next_action_date: Date,
    alert_date: Date,
    priority: Number,
    camp_capacity?: string | null,
    camp_occupancy?: number | null,
    wifi_type: String,
    wifi_expected_cost: Decimal128,
    latitude: String,
    longitude: String,
    wifi_available: Boolean,
    wifi_setup: String,
    createdAt: Date,
    updatedAt: Date
};

const Eq_Enquiry_editSchema: Schema = new Schema({
    enquiry_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry"},
    next_action: {type: String},
    next_action_date: {type: Date},
    alert_date: {type: Date},
    priority: {type: Number},
    camp_capacity: {type: String},
    camp_occupancy: {type: Number},
    wifi_type: {type: String},
    wifi_expected_cost: {type: Schema.Types.Decimal128},
    latitude: {type: String},
    longitude: {type: String},
    wifi_available: {type: Boolean, default: false},
    wifi_setup: {type: String}
}, {timestamps: true});

if (mongoose.models.eq_enquiry_edit && !mongoose.models.eq_enquiry_edit.schema.path("camp_occupancy")) mongoose.deleteModel("eq_enquiry_edit");

const Eq_Enquiry_Edit = mongoose.models?.eq_enquiry_edit || mongoose.model<IEq_Enquiry_edit>("eq_enquiry_edit", Eq_Enquiry_editSchema);

export default Eq_Enquiry_Edit;