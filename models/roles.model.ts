import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IRoles extends Document {
  role_number: Number | null;
  role_name: String | null;
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RolesSchema: Schema = new Schema({
  role_number: { type: Number, enum: [1, 2, 3, 4, 5, 6] },
  role_name: { type: String, enum: ['BUSINESS_ADMIN', 'REGION_HEAD', 'REGION_STAFF', 'REGION_DEP_HEAD', 'REGION_DEP_STAFF', 'AREA_HEAD', 'AREA_STAFF', 'AREA_DEP_HEAD', 'AREA_DEP_STAFF', 'LOCATION_HEAD', 'LOCATION_STAFF', 'LOCATION_DEP_HEAD', 'LOCATION_DEP_STAFF', 'AGENT'] },
}, { timestamps: true });

const Roles = mongoose.models?.roles || mongoose.model<IRoles>('roles', RolesSchema);

export default Roles;

