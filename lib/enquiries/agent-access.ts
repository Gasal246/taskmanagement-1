import mongoose from "mongoose";
import UserRoles from "@/models/user_roles.model";
import { enquiryActor, type EnquiryActor } from "./access";

export class AgentAccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function agentManagementScope(userId: string | null, businessId: string | null) {
  const actor = await enquiryActor();
  if (!actor) throw new AgentAccessError(401, "Unauthorized");
  if (!mongoose.isValidObjectId(userId)) throw new AgentAccessError(400, "Provide a valid agent ID");
  const roles: any[] = await UserRoles.find({ user_id: userId }).populate("role_id", "role_name").lean();
  const agentRoles = roles.filter(row => row.role_id?.role_name === "AGENT" && row.business_id);
  const allowed = agentRoles.filter(row => actor.isSuper || actor.adminBusinessIds?.includes(String(row.business_id)));
  const choices = [...new Set(allowed.map(row => String(row.business_id)))];
  const selected = businessId || (choices.length === 1 ? choices[0] : null);
  if (!selected && choices.length > 1) throw new AgentAccessError(400, "Select a business before managing this agent");
  if (!selected || !choices.includes(selected)) throw new AgentAccessError(403, "You cannot manage this agent in this business");
  return { actor, businessId: selected, roles, agentRole: allowed.find(row => String(row.business_id) === selected) };
}
export async function canChangeAgentAccount(userId: string, roles: any[], businessId: string, actor: EnquiryActor) {
  if (actor.isSuper) return true;
  if (!roles.every(row => String(row.business_id) === businessId)) return false;
  const Staff = (await import("@/models/business_staffs.model")).default;
  const Admins = (await import("@/models/admin_assign_business.model")).default;
  const [otherStaff, otherAdmin] = await Promise.all([
    Staff.exists({ user_id: userId, business_id: { $ne: businessId } }),
    Admins.exists({ user_id: userId, business_id: { $ne: businessId } }),
  ]);
  return !otherStaff && !otherAdmin;
}
