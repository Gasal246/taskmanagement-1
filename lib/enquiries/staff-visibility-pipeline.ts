import mongoose from "mongoose";
import Enquiries from "@/models/eq_enquiries.model";
import Access from "@/models/eq_enquiry_access.model";

// Start with indexed ownership and sharing branches, not a join for every enquiry.
// Keep this staff list's existing creator-or-explicit-access policy, including
// cross-business shares. Duplicate history/access rows must not inflate counts.
export function staffEnquiryVisibilityStages(actorId: mongoose.Types.ObjectId, filter: Record<string, any>): any[] {
  return [
    { $match: { $and: [{ createdBy: actorId }, filter] } },
    { $unionWith: { coll: Access.collection.name, pipeline: [
      { $match: { user_id: actorId } },
      { $group: { _id: "$enquiry_id" } },
      { $lookup: { from: Enquiries.collection.name, localField: "_id", foreignField: "_id",
        pipeline: [{ $match: filter }], as: "_enquiry" } },
      { $unwind: "$_enquiry" },
      { $replaceWith: "$_enquiry" },
    ] } },
    { $group: { _id: "$_id", _enquiry: { $first: "$$ROOT" } } },
    { $replaceWith: "$_enquiry" },
  ];
}
