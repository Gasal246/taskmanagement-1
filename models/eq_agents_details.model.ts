import mongoose, { ObjectId, Schema } from "mongoose";

interface IEq_agents_details extends Document {
    _id: ObjectId,
    country_id: ObjectId,
    region_id: ObjectId,
    contract_no: String,
    user_id: ObjectId,
    createdAt: Date,
    updatedAt: Date
};

const Eq_agents_detailsSchema: Schema = new Schema({
    country_id: {type: Schema.Types.ObjectId, ref: "eq_countries"},
    region_id: {type: Schema.Types.ObjectId, ref: "eq_region"},
    user_id: {type: Schema.Types.ObjectId, ref: "users"},
    contract_no: {type: String}
}, {timestamps: true})

const Eq_agents_details = mongoose?.models.eq_agents_details || mongoose.model<IEq_agents_details>("eq_agents_details", Eq_agents_detailsSchema);

export default Eq_agents_details;