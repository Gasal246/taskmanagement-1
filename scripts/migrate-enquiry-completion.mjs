import mongoose from "mongoose";
import { createRequire } from "node:module";
import { recoverLegacyCompletion } from "../lib/enquiries/legacy-completion.mjs";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
try {
  await mongoose.connect(process.env.MONGO_URI);
  const enquiries = mongoose.connection.collection("eq_enquiries");
  const histories = mongoose.connection.collection("eq_enquiry_histories");
  let scanned = 0, recovered = 0, estimated = 0, written = 0;
  const cursor = enquiries.find({ completed_at: null, $or: [{ status: { $in: ["Closed", "Project Awarded"] } }, { is_converted: true }, { is_completed: true }] });
  for await (const enquiry of cursor) {
    scanned++;
    const rows = await histories.find({ enquiry_id: enquiry._id }).sort({ createdAt: -1 }).toArray();
    const fields = recoverLegacyCompletion(enquiry, rows);
    if (!fields) continue;
    if (fields.completion_date_estimated) estimated++; else recovered++;
    if (apply) {
      // Raw collection writes preserve original createdAt/updatedAt; guard concurrent edits.
      const result = await enquiries.updateOne({ _id: enquiry._id, completed_at: null, updatedAt: enquiry.updatedAt }, { $set: fields });
      written += result.modifiedCount;
    }
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", scanned, recovered, estimated, written }, null, 2));
} finally { await mongoose.disconnect(); }
