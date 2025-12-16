import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_enquiry_wifi_external extends Document{
    _id: ObjectId,
    enquiry_id: ObjectId,
    contractor_name: String,
    contract_start_date: Date,
    contract_end_date: Date,
    contract_speed: String,
    contract_package: String,
    camp_id: ObjectId,
    plain_points: String,
    createdAt: Date,
    updatedAt: Date
}

const Eq_enquiry_wifi_externalSchema: Schema = new Schema({
    camp_id: {type: Schema.Types.ObjectId, ref: "eq_camps"},
    enquiry_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry"},
    contractor_name: {type: String},
    contract_start_date: {type: Date},
    contract_end_date: {type: Date},
    contract_speed: {type: String},
    contract_package: {type: String},
    plain_points: {type: String}
}, {timestamps: true});

const Eq_enquiry_wifi_external = mongoose.models?.eq_enquiry_wifi_external || mongoose.model<IEq_enquiry_wifi_external>("eq_enquiry_wifi_external", Eq_enquiry_wifi_externalSchema);

export default Eq_enquiry_wifi_external;