import Admin_assign_business from "@/models/admin_assign_business.model";
import Business_staffs from "@/models/business_staffs.model";

export async function resolveActiveBusinessIdForUser(userId?: string | null) {
  if (!userId) return null;

  const businessAssignment: { business_id?: string | null } | null =
    (await Business_staffs.findOne({ user_id: userId, status: 1 })
      .select("business_id")
      .lean<{ business_id?: string | null }>()) ||
    (await Admin_assign_business.findOne({ user_id: userId, status: 1 })
      .select("business_id")
      .lean<{ business_id?: string | null }>());

  return businessAssignment?.business_id
    ? String(businessAssignment.business_id)
    : null;
}
