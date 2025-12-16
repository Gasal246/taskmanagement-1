import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IBusiness_regions extends Document {
  _id: ObjectId;
  region_name: String | null;
  business_id: ObjectId | null;
  status: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const Business_regionsSchema: Schema = new Schema({
  region_name: { type: String },
  business_id: { type: Schema.Types.ObjectId, ref: "business" },
  status: { type: Number, default: 1, enum: [0, 1] },
}, { timestamps: true });

Business_regionsSchema.virtual("departments", {
  ref: "region_departments",
  localField: "_id",
  foreignField: "region_id",
});

Business_regionsSchema.set("toObject", { virtuals: true });
Business_regionsSchema.set("toJSON", { virtuals: true });

const Business_regions = mongoose.models?.business_regions || mongoose.model<IBusiness_regions>('business_regions', Business_regionsSchema);

export default Business_regions;

