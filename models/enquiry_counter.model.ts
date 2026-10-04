import mongoose, { Schema } from "mongoose";
const schema = new Schema({ _id: String, sequence: { type: Number, required: true } }, { versionKey: false });
export default mongoose.models.enquiry_counter || mongoose.model("enquiry_counter", schema);
