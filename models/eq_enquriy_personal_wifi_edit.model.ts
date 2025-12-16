import mongoose, { Decimal128, ObjectId, Schema } from "mongoose";

export interface IEq_Enquiry_Personal_Wifi_Edit extends Document{
    _id: ObjectId,
    enquiry_id: ObjectId,
    enquiry_edit_id: ObjectId,
    personal_plan: String,
    personal_start_date: String,
    personal_end_date: String,
    personal_monthly_price: Decimal128,
    createdAt: Date,
    updatedAt: Date
};

const Eq_Enquiry_Personal_Wifi_EditSchema : Schema = new Schema({
    enquiry_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry"},
    enquiry_edit_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry_edit"},
    personal_plan: {type: String},
    personal_start_date: {type: Date},
    personal_end_date: {type: Date},
    personal_monthly_price: {type: Schema.Types.Decimal128}
}, {timestamps: true});

const Eq_Enquiry_Personal_Wifi_Edit = mongoose.models?.eq_enquiry_personal_wifi_edit || mongoose.model<IEq_Enquiry_Personal_Wifi_Edit>("eq_enquiry_personal_wifi_edit", Eq_Enquiry_Personal_Wifi_EditSchema);

export default Eq_Enquiry_Personal_Wifi_Edit;