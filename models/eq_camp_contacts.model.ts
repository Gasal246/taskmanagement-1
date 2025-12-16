import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_camp_contacts extends Document{
    _id: ObjectId,
    contact_name: String
    contact_phone: String,
    contact_email: String,
    contact_authorization: String,
    contact_designation: String,
    is_decision_maker: Boolean,
    camp_id: ObjectId,
    enquiry_id: ObjectId,
    createdAt: Date,
    updatedAt: Date
}

const Eq_camp_contactsSchema:Schema = new Schema({
    contact_name: {type: String},
    contact_phone: {type: String},
    contact_email: {type: String},
    contact_authorization: {type: String},
    contact_designation: {type: String},
    is_decision_maker: {type: Boolean, default: false},
    camp_id: {type: Schema.Types.ObjectId, ref: "eq_camps"},
    enquiry_id: {type: Schema.Types.ObjectId, ref: "eq_enquiry"}
}, {timestamps: true});

const Eq_camp_contacts = mongoose.models?.eq_camp_contacts || mongoose.model<IEq_camp_contacts>("eq_camp_contacts", Eq_camp_contactsSchema);

export default Eq_camp_contacts;
