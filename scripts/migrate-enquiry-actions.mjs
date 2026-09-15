import mongoose from 'mongoose';
import { createRequire } from 'node:module';
import { actionHistoryFilter, assignmentsFor, initialActionFor } from '../lib/enquiries/action-records.mjs';
createRequire(import.meta.url)('@next/env').loadEnvConfig(process.cwd());
const apply = process.argv.includes('--apply');
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
try {
  await mongoose.connect(process.env.MONGO_URI);
  const histories = mongoose.connection.collection('eq_enquiry_histories');
  const enquiries = mongoose.connection.collection('eq_enquiries');
  const summary = { mode: apply ? 'apply' : 'dry-run', forwardedActions: 0, initialActions: 0, assignments: 0, unassignedActions: 0, written: 0,
    legacyCompletionEvents: await histories.countDocuments({ change_type: 'ENQUIRY_COMPLETED' }),
    legacyCompletionFields: await enquiries.countDocuments({ is_completed: true }),
  };
  for await (const action of histories.find({ ...actionHistoryFilter, action_assignments: { $exists: false } })) {
    const parts = assignmentsFor(action).map(p => ({ ...p, user_id: new mongoose.Types.ObjectId(String(p.user_id)) }));
    summary.forwardedActions++; summary.assignments += parts.length;
    if (!parts.length) summary.unassignedActions++;
    if (apply) summary.written += (await histories.updateOne({ _id: action._id, action_assignments: { $exists: false } }, { $set: { action_assignments: parts } })).modifiedCount;
  }
  for await (const enquiry of enquiries.find({ next_action: { $in: ['Call', 'Visit'] } })) {
    if (await histories.findOne({ _id: enquiry._id })) continue;
    const initial = initialActionFor(enquiry);
    summary.initialActions++; summary.assignments += initial.action_assignments.length;
    if (apply) summary.written += (await histories.updateOne({ _id: enquiry._id }, { $setOnInsert: initial }, { upsert: true })).upsertedCount;
  }
  console.log(JSON.stringify(summary, null, 2));
} finally { await mongoose.disconnect(); }
