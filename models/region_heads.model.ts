import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IRegion_heads extends Document {
    _id: ObjectId;
    status: Number | null;
    user_id: ObjectId | null;
    region_id: ObjectId | null;
}

const Region_headsSchema: Schema = new Schema({
    status: { type: Number, enum: [0, 1], default: 1 },
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    region_id: { type: Schema.Types.ObjectId, ref: "business_regions" },
}, { timestamps: true });

const Region_heads = mongoose.models?.region_heads || mongoose.model<IRegion_heads>('region_heads', Region_headsSchema);

export default Region_heads;

