import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBusiness_locations extends Document {
  _id: Types.ObjectId;
  business_id: Types.ObjectId | null;
  location_name: String | null;
  region_id: Types.ObjectId | null;
  area_id: Types.ObjectId | null;
  status: Number,
  createdAt: Date,
  updatedAt: Date,
}

const Business_locationsSchema: Schema = new Schema({
  business_id: { type: Schema.Types.ObjectId },
  location_name: { type: String },
  region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  area_id: { type: Schema.Types.ObjectId, ref: "business_areas" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

Business_locationsSchema.virtual("departments", {
  ref: "location_departments",
  localField: "_id",
  foreignField: "location_id",
});

Business_locationsSchema.set("toObject", { virtuals: true });
Business_locationsSchema.set("toJSON", { virtuals: true });

Business_locationsSchema.index({ area_id: 1, status: 1, _id: 1 });

const Business_locations = mongoose.models?.business_locations || mongoose.model<IBusiness_locations>('business_locations', Business_locationsSchema);

export default Business_locations;

