import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IBusiness_areas extends Document {
  _id: ObjectId;
  area_name: String | null;
  business_id: ObjectId | null;
  region_id: ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Business_areasSchema: Schema = new Schema({
  area_name: { type: String },
  business_id: { type: Schema.Types.ObjectId, ref: "business" },
  region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true });

Business_areasSchema.virtual("departments", {
  ref: "area_departments",
  localField: "_id",
  foreignField: "area_id",
});

Business_areasSchema.set("toObject", { virtuals: true });
Business_areasSchema.set("toJSON", { virtuals: true });

const Business_areas = mongoose.models?.business_areas || mongoose.model<IBusiness_areas>('business_areas', Business_areasSchema);

export default Business_areas;

