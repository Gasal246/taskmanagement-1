import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_camp_client_company extends Document{
    _id: ObjectId,
    client_company_name: String,
    createdAt: Date,
    updatedAt: Date
};

const Eq_camp_client_companySchema:Schema = new Schema({
    client_company_name: {type: String}
}, {timestamps: true});

const Eq_camp_client_company = mongoose.models?.eq_camp_client_company || mongoose.model<IEq_camp_client_company>("eq_camp_client_company", Eq_camp_client_companySchema);

export default Eq_camp_client_company;