import mongoose from 'mongoose';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongo';
import Targets from '@/models/eq_enquiry_targets.model';
import Enquiries from '@/models/eq_enquiries.model';
import Regions from '@/models/eq_region.model';
import Countries from '@/models/eq_countries.model';
import EqUsers from '@/models/eq_enquiry_users.model';
import Users from '@/models/users.model';
import Businesses from '@/models/business.model';
import Camps from '@/models/eq_camps.model';
import { enquiryActor, canAdministerEnquiry, type EnquiryActor } from './access';
import { enrichEnquiries } from './completion-server';
import { idOf } from './completion';
import { validTargetMonth, type TargetInput, type TargetChange } from './targets';
import { escapeSearch, pageBounds } from '@/lib/search';
import { temporaryDatabaseFailureResponse } from '@/lib/auth-availability';

export class TargetError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const objectId = z.string().regex(/^[a-f\d]{24}$/i).transform(value => value.toLowerCase());
const ids = z.array(objectId).min(1).max(1000).transform(value => [...new Set(value)]);
const period = { month: z.string().refine(validTargetMonth), week: z.number().int().min(1).max(4).nullable() };
const inputSchema = z.object({ business_id: objectId, ...period }).strict();
const note = z.string().trim().max(5000);
const changeSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('period'), ...period }).strict(),
  z.object({ operation: z.literal('add_enquiries'), country_id: objectId, region_id: objectId, enquiry_ids: ids, note }).strict(),
  z.object({ operation: z.literal('edit_note'), enquiry_id: objectId, note }).strict(),
  z.object({ operation: z.literal('remove_enquiry'), enquiry_id: objectId }).strict(),
  z.object({ operation: z.literal('add_members'), user_ids: ids }).strict(),
  z.object({ operation: z.literal('remove_member'), user_id: objectId }).strict(),
]);
export function parseTargetInput(body: unknown): TargetInput {
  const result = inputSchema.safeParse(body);
  if (!result.success) throw new TargetError(400, 'Select a valid business, month and optional week.');
  return result.data;
}
export function parseTargetChange(body: unknown): TargetChange {
  const result = changeSchema.safeParse(body);
  if (!result.success) throw new TargetError(400, 'Invalid target change. Select valid enquiries or members and keep notes within 5,000 characters.');
  return result.data;
}
function oid(id: string) {
  if (!objectId.safeParse(id).success) throw new TargetError(400, 'Invalid target or filter ID');
  return new mongoose.Types.ObjectId(id);
}
export function requireTargetAdmin(actor: EnquiryActor, businessId: string) {
  if (!canAdministerEnquiry({ business_id: businessId }, actor)) throw new TargetError(403, 'Only this business’s administrator can manage targets');
}
export function targetReadFilter(actor: EnquiryActor, staff = false): Record<string, any> {
  return staff || !actor.admin ? { assigned_user_ids: oid(actor.actorId) } : actor.isSuper ? {} : { business_id: { $in: (actor.adminBusinessIds || []).map(oid) } };
}
export async function validateTargetInput(body: unknown, actor: EnquiryActor) {
  const input = parseTargetInput(body);
  requireTargetAdmin(actor, input.business_id);
  if (!await Businesses.exists({ _id: input.business_id, status: 1 })) throw new TargetError(400, 'Business is unavailable');
  return input;
}
/** Build a narrow atomic update, so editing a period/note cannot replace team membership. */
export async function prepareTargetChange(existing: any, body: unknown, actor: EnquiryActor) {
  requireTargetAdmin(actor, idOf(existing.business_id));
  const change = parseTargetChange(body);
  const business_id = idOf(existing.business_id);
  const proposed = { ...existing, enquiry_ids: existing.enquiry_ids.map(idOf), assigned_user_ids: existing.assigned_user_ids.map(idOf) };
  const filter: any = { _id: existing._id };
  const update: any = { $set: { updated_by: actor.actorId } };
  switch (change.operation) {
    case 'period':
      Object.assign(update.$set, { month: change.month, week: change.week });
      Object.assign(proposed, { month: change.month, week: change.week });
      break;
    case 'add_enquiries': {
      const [country, region, count] = await Promise.all([
        Countries.exists({ _id: change.country_id }),
        Regions.exists({ _id: change.region_id, country_id: change.country_id }),
        Enquiries.countDocuments({ _id: { $in: change.enquiry_ids }, business_id, country_id: change.country_id, region_id: change.region_id }),
      ]);
      if (!country || !region || count !== change.enquiry_ids.length) throw new TargetError(400, 'Every selected enquiry must belong to this business and region');
      if (change.enquiry_ids.some(id => proposed.enquiry_ids.includes(id))) throw new TargetError(409, 'An enquiry is already in this target. Refresh the list.');
      if (proposed.enquiry_ids.length + change.enquiry_ids.length > 1000) throw new TargetError(400, 'A target can contain up to 1,000 enquiries');
      filter.enquiry_ids = { $nin: change.enquiry_ids };
      filter.$expr = { $lte: [{ $size: '$enquiry_ids' }, 1000 - change.enquiry_ids.length] };
      update.$addToSet = { enquiry_ids: { $each: change.enquiry_ids } };
      for (const id of change.enquiry_ids) update.$set[`enquiry_notes.${id}`] = change.note;
      proposed.enquiry_ids.push(...change.enquiry_ids);
      break;
    }
    case 'edit_note':
      if (!proposed.enquiry_ids.includes(change.enquiry_id)) throw new TargetError(404, 'Enquiry is no longer in this target');
      filter.enquiry_ids = change.enquiry_id;
      update.$set[`enquiry_notes.${change.enquiry_id}`] = change.note;
      break;
    case 'remove_enquiry':
      filter.enquiry_ids = change.enquiry_id;
      update.$pull = { enquiry_ids: change.enquiry_id };
      update.$unset = { [`enquiry_notes.${change.enquiry_id}`]: '' };
      break;
    case 'add_members': {
      const [memberships, count] = await Promise.all([
        EqUsers.find({ business_id, user_id: { $in: change.user_ids } }).distinct('user_id'),
        Users.countDocuments({ _id: { $in: change.user_ids }, status: 1 }),
      ]);
      if (memberships.length !== change.user_ids.length || count !== change.user_ids.length) throw new TargetError(400, 'Select active enquiry staff from this business');
      const combined = [...new Set([...proposed.assigned_user_ids, ...change.user_ids])];
      if (combined.length > 1000) throw new TargetError(400, 'A target can contain up to 1,000 members');
      filter.$expr = { $lte: [{ $size: { $setUnion: ['$assigned_user_ids', change.user_ids.map(oid)] } }, 1000] };
      update.$addToSet = { assigned_user_ids: { $each: change.user_ids } };
      proposed.assigned_user_ids = combined;
      break;
    }
    case 'remove_member':
      filter.assigned_user_ids = change.user_id;
      update.$pull = { assigned_user_ids: change.user_id };
      break;
  }
  return { filter, update, proposed, change };
}
export async function readableTarget(id: string, actor: EnquiryActor, staff = false): Promise<any> {
  const target = await Targets.findOne({ _id: oid(id), ...targetReadFilter(actor, staff) }).lean();
  if (!target) throw new TargetError(404, 'Target not found');
  return target;
}
export async function findTargetOverlaps(input: { business_id: any; month: string; week: number | null; enquiry_ids: any[]; assigned_user_ids: any[] }, excludeId?: string) {
  return Targets.find({ business_id: input.business_id, month: input.month,
    ...(excludeId ? { _id: { $ne: oid(excludeId) } } : {}),
    ...(input.week === null ? {} : { week: { $in: [null, input.week] } }),
    enquiry_ids: { $in: input.enquiry_ids }, assigned_user_ids: { $in: input.assigned_user_ids },
  }).select('_id month week enquiry_ids assigned_user_ids').limit(100).lean();
}
function enquiryLocationFilter(params: URLSearchParams): Record<string, any> {
  const filter: Record<string, any> = {};
  for (const key of ['country_id', 'region_id']) if (params.get(key)) filter[key] = oid(params.get(key)!);
  return filter;
}
export async function targetEnquiries(target: any, params: URLSearchParams, actor: EnquiryActor) {
  const { page, limit, skip } = pageBounds(params, 10, 20);
  const filter = { business_id: target.business_id, _id: { $in: target.enquiry_ids }, ...enquiryLocationFilter(params) };
  const [entries, totalRecords] = await Promise.all([
    Enquiries.find(filter).populate({ path: 'camp_id', model: Camps }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Enquiries.countDocuments(filter),
  ]);
  const enriched = await enrichEnquiries(entries, actor);
  return { data: enriched.map(e => ({ ...e, target_note: target.enquiry_notes?.[idOf(e)] || '' })), pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) } };
}
export async function listTargets(params: URLSearchParams, actor: EnquiryActor) {
  const filter = targetReadFilter(actor, params.get('view') === 'staff');
  const businessId = params.get('business_id');
  if (businessId) {
    if (actor.admin && params.get('view') !== 'staff') requireTargetAdmin(actor, businessId);
    filter.business_id = oid(businessId);
  }
  const location = enquiryLocationFilter(params);
  if (Object.keys(location).length) {
    filter.enquiry_ids = { $in: await Enquiries.find({ ...location, ...(filter.business_id ? { business_id: filter.business_id } : {}) }).distinct('_id') };
  }
  if (params.get('person')) {
    if (!actor.admin || params.get('view') === 'staff') throw new TargetError(403, 'Person filtering is available to administrators only');
    filter.assigned_user_ids = oid(params.get('person')!);
  }
  const month = params.get('month');
  if (month) { if (!validTargetMonth(month)) throw new TargetError(400, 'Invalid target month'); filter.month = month; }
  const week = params.get('week');
  if (week) { if (!['whole', '1', '2', '3', '4'].includes(week)) throw new TargetError(400, 'Invalid target week'); filter.week = week === 'whole' ? null : Number(week); }
  const { page, limit, skip } = pageBounds(params, 5, 10);
  const [rows, totalRecords] = await Promise.all([
    Targets.find(filter).sort({ month: -1, week: -1, createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Targets.countDocuments(filter),
  ]);
  const enquiryParams = new URLSearchParams({ country_id: params.get('country_id') || '', region_id: params.get('region_id') || '' });
  const pages = await Promise.all(rows.map((row: any) => targetEnquiries(row, enquiryParams, actor)));
  // Populate a separate members field so original IDs (including deleted users) remain removable.
  const memberIds = [...new Set(rows.flatMap((r: any) => r.assigned_user_ids.map(idOf)))];
  const users = await Users.find({ _id: { $in: memberIds } }).select('name email').lean();
  const userMap = new Map(users.map((u: any) => [idOf(u), u]));
  return { data: rows.map((row: any, i: number) => ({
    ...row, enquiry_notes: undefined, enquiry_count: row.enquiry_ids.length,
    members: row.assigned_user_ids.map((id: any) => userMap.get(idOf(id)) || { _id: id, name: 'Unavailable user' }),
    enquiries: pages[i].data, enquiryPagination: pages[i].pagination,
  })), pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) } };
}
async function options(params: URLSearchParams, actor: EnquiryActor) {
  const staff = params.get('view') === 'staff' || !actor.admin;
  const businessId = params.get('business_id');
  if (businessId) oid(businessId);
  if (!staff && businessId) requireTargetAdmin(actor, businessId);
  const businesses = staff ? [] : await Businesses.find({ status: 1, ...(actor.isSuper ? {} : { _id: { $in: actor.adminBusinessIds || [] } }) }).select('business_name').sort({ business_name: 1 }).lean();
  const [countries, regions] = await Promise.all([Countries.find().select('country_name').sort({ country_name: 1 }).lean(), Regions.find().select('region_name country_id').sort({ region_name: 1 }).lean()]);
  const memberIds = !staff ? await EqUsers.find({ business_id: businessId || { $in: businesses.map((b: any) => b._id) } }).distinct('user_id') : [];
  const users = await Users.find({ _id: { $in: memberIds }, status: 1 }).select('name email').sort({ name: 1 }).lean();
  return { businesses, countries, regions, users };
}
async function candidates(params: URLSearchParams, actor: EnquiryActor) {
  const business = params.get('business_id') || '';
  requireTargetAdmin(actor, business); oid(business);
  const filter: any = { business_id: business, country_id: oid(params.get('country_id') || ''), region_id: oid(params.get('region_id') || '') };
  const search = params.get('search')?.trim();
  if (search) {
    const regex = new RegExp(escapeSearch(search), 'i');
    const camps = await Camps.find({ camp_name: regex }).distinct('_id');
    filter.$or = [{ enquiry_uuid: regex }, { camp_id: { $in: camps } }];
  }
  const { page, limit, skip } = pageBounds(params, 20);
  const [data, totalRecords] = await Promise.all([Enquiries.find(filter).select('enquiry_uuid camp_id').populate({ path: 'camp_id', model: Camps, select: 'camp_name' }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(), Enquiries.countDocuments(filter)]);
  return { data, pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) } };
}
export async function targetHandler(req: NextRequest, operation: 'list' | 'create' | 'detail' | 'update' | 'delete' | 'overlaps' | 'options' | 'candidates' | 'enquiries', id?: string) {
  try {
    await connectDB({ throwOnError: true });
    const actor = await enquiryActor();
    if (!actor) throw new TargetError(401, 'Unauthorized');
    const params = req.nextUrl.searchParams;
    if (operation === 'list') return NextResponse.json(await listTargets(params, actor));
    if (operation === 'options') return NextResponse.json(await options(params, actor));
    if (operation === 'candidates') return NextResponse.json(await candidates(params, actor));
    let existing: any;
    if (id) {
      existing = await readableTarget(id, actor, params.get('view') === 'staff');
      if (!['detail', 'enquiries'].includes(operation)) requireTargetAdmin(actor, idOf(existing.business_id));
    }
    if (operation === 'enquiries') return NextResponse.json(await targetEnquiries(existing, params, actor));
    if (operation === 'detail') return NextResponse.json({ target: existing });
    if (operation === 'delete') { await Targets.deleteOne({ _id: existing._id }); return NextResponse.json({ message: 'Target deleted' }); }
    if (!actor.admin) throw new TargetError(403, 'Only administrators can manage targets');
    let body; try { body = await req.json(); } catch { throw new TargetError(400, 'Invalid JSON'); }
    if (operation === 'create') {
      const input = await validateTargetInput(body, actor);
      const target = await Targets.create({ ...input, enquiry_ids: [], assigned_user_ids: [], created_by: actor.actorId, updated_by: actor.actorId });
      return NextResponse.json({ target }, { status: 201 });
    }
    if (operation === 'overlaps') {
      if (!body || typeof body.target_id !== 'string') throw new TargetError(400, 'Provide a target ID');
      const target = await readableTarget(body.target_id, actor);
      const { proposed } = await prepareTargetChange(target, body.change, actor);
      return NextResponse.json({ overlaps: await findTargetOverlaps(proposed, body.target_id) });
    }
    const { filter, update } = await prepareTargetChange(existing, body, actor);
    const target = await Targets.findOneAndUpdate(filter, update, { new: true, runValidators: true });
    if (!target) throw new TargetError(409, 'Target membership changed or the target was deleted. Refresh and try again.');
    return NextResponse.json({ target });

  } catch (error) {
    const unavailable = temporaryDatabaseFailureResponse(error); if (unavailable) return unavailable;
    const status = error instanceof TargetError ? error.status : error instanceof Error && /^Invalid (search|pagination)/.test(error.message) ? 400 : 500;
    if (status === 500) console.error('Enquiry target request failed', error);
    return NextResponse.json({ message: status === 500 ? 'Unable to process targets' : (error as Error).message }, { status });
  }
}
