import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  business_id: { type: Schema.Types.ObjectId, ref: "business", required: true, index: true },
  requested_by: { type: Schema.Types.ObjectId, ref: "users", required: true },
  enquiry_id: { type: Schema.Types.ObjectId, ref: "eq_enquiry" },
  camp_ids: [{ type: Schema.Types.ObjectId, ref: "eq_camps" }],
  detach_camp_ids: [{ type: Schema.Types.ObjectId, ref: "eq_camps" }],
  office_id: { type: Schema.Types.ObjectId, ref: "eq_camp_headoffice" },
  selected_office_id: { type: Schema.Types.ObjectId, ref: "eq_camp_headoffice" },
  operation: { type: String, enum: ["create", "link", "edit", "remove"], required: true },
  proposed: { type: Schema.Types.Mixed, required: true },
  before_office: Schema.Types.Mixed,
  before_links: [{ camp_id: Schema.Types.ObjectId, office_id: Schema.Types.ObjectId }],
  scope_key: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected", "withdrawn"], default: "pending", index: true },
  revision: { type: Number, default: 1 },
  revisions: [Schema.Types.Mixed],
  reviewed_by: { type: Schema.Types.ObjectId, ref: "users" },
  reviewed_at: Date,
  review_note: String,
  resolution: String,
  approved_office_id: { type: Schema.Types.ObjectId, ref: "eq_camp_headoffice" },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ scope_key: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });
// Refresh the cached model when correcting the reference during development.
if (mongoose.models.eq_head_office_request && mongoose.models.eq_head_office_request.schema.path("enquiry_id").options.ref !== "eq_enquiry") {
  mongoose.deleteModel("eq_head_office_request");
}
export default mongoose.models.eq_head_office_request || mongoose.model("eq_head_office_request", schema);
