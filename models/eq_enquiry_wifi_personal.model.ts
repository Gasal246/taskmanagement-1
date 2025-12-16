import mongoose, { Decimal128, ObjectId, Schema } from "mongoose";

export interface IEq_enquiry_wifi_personal extends Document{
    _id: ObjectId,
    camp_id: ObjectId,
    enquiry_id: ObjectId,
    personal_plan: String,
    personal_start_date: Date,
    personal_end_date: Date,
    personal_monthly_price: Decimal128,
    createdAt: Date,
    updatedAt: Date
}

const Eq_enquiry_wifi_personalSchema:Schema =  new Schema({
    camp_id: {type: Schema.Types.ObjectId, ref: "eq_camps"},
    enquiry_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry"},
    personal_plan: {type: String},
    personal_start_date: {type: Date},
    personal_end_date: {type: Date},
    personal_monthly_price: {type: Schema.Types.Decimal128}
}, {timestamps: true});

const Eq_enquiry_wifi_personal = mongoose.models?.eq_enquiry_wifi_personal || mongoose.model<IEq_enquiry_wifi_personal>("eq_enquiry_wifi_personal", Eq_enquiry_wifi_personalSchema);

export default Eq_enquiry_wifi_personal;