import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRegion_heads extends Document {
    _id: Types.ObjectId;
    status: Number | null;
    user_id: Types.ObjectId | null;
    region_id: Types.ObjectId | null;
}

const Region_headsSchema: Schema = new Schema({
    status: { type: Number, enum: [0, 1], default: 1 },
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
}, { timestamps: true });

Region_headsSchema.index({ region_id: 1, status: 1, _id: 1 });
Region_headsSchema.index({ user_id: 1, region_id: 1, status: 1 });

const Region_heads = mongoose.models?.region_heads || mongoose.model<IRegion_heads>('region_heads', Region_headsSchema);

export default Region_heads;

