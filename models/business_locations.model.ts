import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IBusiness_locations extends Document {
  _id: ObjectId;
  business_id: ObjectId | null;
  location_name: String | null;
  region_id: ObjectId | null;
  area_id: ObjectId | null;
  status: Number,
  createdAt: Date,
  updatedAt: Date,
}

const Business_locationsSchema: Schema = new Schema({
  business_id: { type: Schema.Types.ObjectId },
  location_name: { type: String },
  region_id: { type: Schema.Types.ObjectId },
  area_id: { type: Schema.Types.ObjectId },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

Business_locationsSchema.virtual("departments", {
  ref: "location_departments",
  localField: "_id",
  foreignField: "location_id",
});

Business_locationsSchema.set("toObject", { virtuals: true });
Business_locationsSchema.set("toJSON", { virtuals: true });

const Business_locations = mongoose.models?.business_locations || mongoose.model<IBusiness_locations>('business_locations', Business_locationsSchema);

export default Business_locations;

