import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_Enquiry_External_Wifi_Edit extends Document{
    _id: ObjectId,
    enquiry_id: ObjectId,
    enquiry_edit_id: ObjectId,
    contractor_name: String,
    contract_start_date: Date,
    contract_end_date: Date,
    contract_package: String,
    contract_speed: String,
    createdAt: Date,
    updatedAt: Date
};

const Eq_Enquiry_External_Wifi_EditSchema : Schema = new Schema({
    enquiry_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry"},
    enquiry_edit_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry_edit"},
    contractor_name: {type: String},
    contract_start_date: {type: Date},
    contract_end_date: {type: Date},
    contract_package: {type: String},
    contract_speed: {type: String}
}, {timestamps: true});

const Eq_Enquiry_External_Wifi_Edit = mongoose.models?.eq_enquiry_external_wifi_edit || mongoose.model<IEq_Enquiry_External_Wifi_Edit>("eq_enquiry_external_wifi_edit", Eq_Enquiry_External_Wifi_EditSchema);

export default Eq_Enquiry_External_Wifi_Edit;