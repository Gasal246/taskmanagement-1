import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_camp_headoffice extends Document{
    _id: ObjectId,
    created_by?: ObjectId,
    createdBy?: ObjectId,
    phone: String,
    geo_location: String,
    other_details: String,
    address: String,
    createdAt: Date,
    updatedAt: Date
}

const Eq_camp_headofficeSchema:Schema = new Schema({
    created_by: { type: Schema.Types.ObjectId, ref: "users" },
    createdBy: { type: Schema.Types.ObjectId, ref: "users" },
    phone: {type:String},
    geo_location: {type:String},
    other_details: {type: String},
    address: {type: String}
}, {timestamps: true});

const Eq_camp_headoffice = mongoose.models?.eq_camp_headoffice || mongoose.model<IEq_camp_headoffice>("eq_camp_headoffice", Eq_camp_headofficeSchema);

export default Eq_camp_headoffice;
