import mongoose from "mongoose";
import Counter from "@/models/enquiry_counter.model";
import Enquiries from "@/models/eq_enquiries.model";
import { formatEnquiryUuid } from "./enquiry-uuid";
import { escapeSearch } from "@/lib/search";

export async function reserveEnquiryUuid(prefix: string, sector: string, now: Date, session: mongoose.ClientSession) {
  const base = formatEnquiryUuid(prefix, sector, now, 0).replace(/0$/, "");
  const current = await Counter.findById(base).session(session).lean();
  if (!current) {
    // Seed from legacy suffixes, so adopting counters does not reuse old IDs.
    const [legacy] = await Enquiries.aggregate([
      { $match: { enquiry_uuid: { $regex: `^${escapeSearch(base)}[0-9]+$` } } },
      { $project: { number: { $convert: { input: { $arrayElemAt: [{ $split: ["$enquiry_uuid", "-"] }, -1] }, to: "int", onError: 0, onNull: 0 } } } },
      { $group: { _id: null, max: { $max: "$number" } } },
    ]).session(session);
    await Counter.updateOne({ _id: base }, { $setOnInsert: { sequence: legacy?.max || 0 } }, { upsert: true, session });
  }
  const result: any = await Counter.findByIdAndUpdate(base, { $inc: { sequence: 1 } }, { session, new: true });
  return formatEnquiryUuid(prefix, sector, now, result.sequence);
}
