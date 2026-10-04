import { z } from "zod";
import mongoose from "mongoose";
import Users from "@/models/users.model";
import Staff from "@/models/business_staffs.model";
const objectId = z.string().refine(value => mongoose.Types.ObjectId.isValid(value), "Invalid ID");
const members = z.array(objectId).max(500).transform(values => [...new Set(values)]);
export const createTeamSchema = z.object({
  team_name: z.string().trim().min(1).max(200), project_id: objectId, project_dept_id: objectId,
  department_id: objectId.optional(), team_lead_id: objectId, team_member_ids: members.optional().default([]),
});
export const editTeamSchema = z.object({
  _id: objectId, team_name: z.string().trim().min(1).max(200), team_head: objectId.nullable().optional(), team_members: members,
});
export async function areActiveProjectStaff(project: any, ids: string[], dbSession?: mongoose.ClientSession) {
  const unique = [...new Set(ids)];
  if (!unique.length) return true;
  const usersQuery = Users.find({ _id: { $in: unique }, status: 1 }).select("_id");
  const staffQuery = Staff.find({ user_id: { $in: unique }, business_id: project.business_id, status: 1 }).select("user_id");
  if (dbSession) { usersQuery.session(dbSession); staffQuery.session(dbSession); }
  const [users, staff] = dbSession
    ? [await usersQuery.lean(), await staffQuery.lean()]
    : await Promise.all([usersQuery.lean(), staffQuery.lean()]);
  const memberIds = new Set(staff.map((row: any) => String(row.user_id)));
  return users.length === unique.length && unique.every(id => memberIds.has(id));
}
