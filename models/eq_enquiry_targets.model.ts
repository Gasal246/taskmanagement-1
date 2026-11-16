import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  business_id: { type: Schema.Types.ObjectId, ref: 'business', required: true, immutable: true },
  country_id: { type: Schema.Types.ObjectId, ref: 'eq_countries' },
  region_id: { type: Schema.Types.ObjectId, ref: 'eq_region' },
  title: { type: String, trim: true, maxlength: 200 },
  month: { type: String, required: true, match: /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/ },
  week: { type: Number, enum: [1, 2, 3, 4, null], default: null },
  enquiry_ids: [{ type: Schema.Types.ObjectId, ref: 'eq_enquiry', required: true }],
  enquiry_notes: { type: Map, of: String, default: {} },
  assigned_user_ids: [{ type: Schema.Types.ObjectId, ref: 'users', required: true }],
  created_by: { type: Schema.Types.ObjectId, ref: 'users', required: true },
  updated_by: { type: Schema.Types.ObjectId, ref: 'users', required: true },
}, { timestamps: true });
schema.index({ business_id: 1, month: -1, week: -1, createdAt: -1, _id: -1 });
schema.index({ assigned_user_ids: 1, month: -1, week: -1, createdAt: -1, _id: -1 });
// Separate indexes: MongoDB cannot compound two array fields in a multikey index.
schema.index({ enquiry_ids: 1, business_id: 1, month: 1 });
// Reload cached schemas when additive fields are introduced.
if (mongoose.models.eq_enquiry_targets && (!mongoose.models.eq_enquiry_targets.schema.path('enquiry_notes') || !mongoose.models.eq_enquiry_targets.schema.path('title'))) mongoose.deleteModel('eq_enquiry_targets');
export default mongoose.models.eq_enquiry_targets || mongoose.model('eq_enquiry_targets', schema);
