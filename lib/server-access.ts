import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import AdminAssignments from "@/models/admin_assign_business.model";
import BusinessStaffs from "@/models/business_staffs.model";
import UserRoles from "@/models/user_roles.model";
import Roles from "@/models/roles.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function canAdministerBusiness(userId: string, businessId: unknown): Promise<boolean> {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(businessId)) return false;
  return Boolean(await AdminAssignments.exists({ user_id: userId, business_id: businessId, status: 1 }));
}

export async function canAccessBusiness(userId: string, businessId: unknown): Promise<boolean> {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(businessId)) return false;
  const [admin, staff] = await Promise.all([
    AdminAssignments.exists({ user_id: userId, business_id: businessId, status: 1 }),
    BusinessStaffs.exists({ user_id: userId, business_id: businessId, status: 1 }),
  ]);
  return Boolean(admin || staff);
}

export async function canManageUsers(actorId: string, targetIds: string[]): Promise<boolean> {
  if (!mongoose.isValidObjectId(actorId) || !targetIds.length || targetIds.some(id => !mongoose.isValidObjectId(id))) return false;
  const businesses = await AdminAssignments.find({ user_id: actorId, status: 1 }).distinct("business_id");
  if (!businesses.length) return false;
  // Agents have a business-scoped AGENT role rather than a staff membership.
  const [staffIds, agentRole] = await Promise.all([
    BusinessStaffs.find({ user_id: { $in: targetIds }, business_id: { $in: businesses }, status: 1 }).distinct("user_id"),
    Roles.findOne({ role_name: "AGENT" }).select("_id").lean<{ _id: mongoose.Types.ObjectId }>(),
  ]);
  const agentIds = agentRole ? await UserRoles.find({ user_id: { $in: targetIds }, role_id: agentRole._id, business_id: { $in: businesses } }).distinct("user_id") : [];
  const managed = new Set([...staffIds, ...agentIds].map(String));
  return targetIds.every(id => managed.has(id));
}

export async function canManageUser(actorId: string, targetId: string): Promise<boolean> {
  return canManageUsers(actorId, [targetId]);
}

export async function getActiveSession() {
  await connectDB();
  return auth();
}

export async function requireSuperadmin() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return session.user.is_super ? null : NextResponse.json({ message: "Superadmin access required" }, { status: 403 });
}

export async function authorizeUserManagement(targetId: string, businessId?: unknown) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.is_super) return null;
  if (businessId && !await canAdministerBusiness(session.user.id, businessId)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  return await canManageUser(session.user.id, targetId) ? null : NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

export async function authorizeUserProfile(targetId: unknown) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (typeof targetId !== "string" || !mongoose.isValidObjectId(targetId)) return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  if (session.user.is_super || session.user.id === targetId) return null;
  return await canManageUser(session.user.id, targetId) ? null : NextResponse.json({ message: "Forbidden" }, { status: 403 });
}
