import mongoose, { Document, Types, Schema } from "mongoose";

interface IEq_agents_details extends Document {
    _id: Types.ObjectId,
    country_id: Types.ObjectId,
    region_id: Types.ObjectId,
    contract_no: String,
    contract_expiry: Date,
    user_id: Types.ObjectId,
    createdAt: Date,
    updatedAt: Date
};

const Eq_agents_detailsSchema: Schema = new Schema({
    country_id: {type: Schema.Types.ObjectId, ref: "eq_countries"},
    region_id: {type: Schema.Types.ObjectId, ref: "eq_region"},
    user_id: {type: Schema.Types.ObjectId, ref: "users"},
    contract_no: {type: String},
    contract_expiry: {type: Date}
}, {timestamps: true})

const Eq_agents_details = mongoose?.models.eq_agents_details || mongoose.model<IEq_agents_details>("eq_agents_details", Eq_agents_detailsSchema);

export default Eq_agents_details;