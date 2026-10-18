import mongoose from 'mongoose';
import Targets from '@/models/eq_enquiry_targets.model';
import { idOf } from './completion';
export async function hasTargetAccess(enquiry: any, actorId: string) {
  return Boolean(enquiry.business_id && await Targets.exists({ business_id: idOf(enquiry.business_id), enquiry_ids: enquiry._id, assigned_user_ids: actorId }));
}
export async function targetEnquiryIds(entries: any[], actorId: string): Promise<Set<string>> {
  if (!entries.length) return new Set();
  const targets: any[] = await Targets.find({ assigned_user_ids: actorId, enquiry_ids: { $in: entries.map(e => e._id) } }).select('business_id enquiry_ids').lean();
  return new Set(entries.filter(e => targets.some(t => idOf(t.business_id) === idOf(e.business_id) && t.enquiry_ids.some((id: any) => idOf(id) === idOf(e)))).map(idOf));
}
export function targetVisibilityLookup(userId: mongoose.Types.ObjectId): any {
  return { $lookup: { from: Targets.collection.name, localField: '_id', foreignField: 'enquiry_ids', let: { business: '$business_id' }, pipeline: [
    { $match: { assigned_user_ids: userId, $expr: { $eq: ['$business_id', '$$business'] } } }, { $limit: 1 }, { $project: { _id: 1 } },
  ], as: '_targetAccess' } };
}
