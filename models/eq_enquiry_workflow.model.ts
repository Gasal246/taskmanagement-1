import mongoose, { Schema } from 'mongoose';
import { DEFAULT_ROLE_COLOR } from '@/lib/enquiries/workflow';

const recordDates = { createdAt: { type: Date, required: true }, updatedAt: { type: Date, required: true } };
const role = new Schema({
  ...recordDates,
  color_code: { type: String, required: true, default: DEFAULT_ROLE_COLOR, match: /^#[0-9a-f]{6}$/i, lowercase: true },
  subname: { type: String, required: true, match: /^[A-Z]+$/, maxlength: 32 },
  name: { type: String, required: true, trim: true, maxlength: 200 },
});
const stage = new Schema({
  ...recordDates,
  name: { type: String, required: true, trim: true, maxlength: 200 },
  role_id: { type: Schema.Types.ObjectId, required: true },
});
const schema = new Schema({
  // Tenant business ID, not a customer from the clients catalogue.
  client_id: { type: Schema.Types.ObjectId, ref: 'business', required: true, immutable: true },
  progress_serial: { type: Number, default: 0 },
  revision: { type: Number, required: true, default: 0 },
  roles: { type: [role], default: [] },
  stages: { type: [stage], default: [] },
}, { timestamps: true });
schema.index({ client_id: 1 }, { unique: true });
// Next.js hot reload can retain a compiled model from before role colors existed.
// Refresh it so strict schema casting does not silently discard color_code on save.
const cached = mongoose.models.eq_enquiry_workflow;
if (cached && (!cached.schema.path('progress_serial') || !cached.schema.path<Schema.Types.DocumentArray>('roles')?.schema.path('color_code'))) {
  mongoose.deleteModel('eq_enquiry_workflow');
}
export default mongoose.models.eq_enquiry_workflow || mongoose.model('eq_enquiry_workflow', schema);
