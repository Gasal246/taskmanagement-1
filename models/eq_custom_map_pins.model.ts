import mongoose, { Document, Types, Schema } from "mongoose";

export interface IEqCustomMapPin extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
}

const EqCustomMapPinSchema: Schema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { timestamps: true }
);

const EqCustomMapPins =
  mongoose.models?.eq_custom_map_pins ||
  mongoose.model<IEqCustomMapPin>("eq_custom_map_pins", EqCustomMapPinSchema);

export default EqCustomMapPins;
