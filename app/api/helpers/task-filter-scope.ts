import { HEAD_ROLES } from "@/lib/constants";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Area_heads from "@/models/area_heads.model";
import Area_staffs from "@/models/area_staffs.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Location_heads from "@/models/location_heads.model";
import Location_staffs from "@/models/location_staffs.model";
import Business_staffs from "@/models/business_staffs.model";
import User_roles from "@/models/user_roles.model";
import "@/models/roles.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Region_heads from "@/models/region_heads.model";
import Region_staffs from "@/models/region_staffs.model";

type ScopeConfig = {
  headModel: any;
  headDomainField: string;
  staffModel: any;
  staffDomainField: string;
  staffUserField: string;
};

const scopeConfigs: Record<string, ScopeConfig> = {
  REGION_HEAD: { headModel: Region_heads, headDomainField: "region_id", staffModel: Region_staffs, staffDomainField: "region_id", staffUserField: "staff_id" },
  REGION_DEP_HEAD: { headModel: Region_dep_heads, headDomainField: "reg_dep_id", staffModel: Region_dep_staffs, staffDomainField: "region_dep_id", staffUserField: "user_id" },
  AREA_HEAD: { headModel: Area_heads, headDomainField: "area_id", staffModel: Area_staffs, staffDomainField: "area_id", staffUserField: "staff_id" },
  AREA_DEP_HEAD: { headModel: Area_dep_heads, headDomainField: "area_dep_id", staffModel: Area_dep_staffs, staffDomainField: "area_dep_id", staffUserField: "user_id" },
  LOCATION_HEAD: { headModel: Location_heads, headDomainField: "location_id", staffModel: Location_staffs, staffDomainField: "location_id", staffUserField: "user_id" },
  LOCATION_DEP_HEAD: { headModel: Location_dep_heads, headDomainField: "location_dep_id", staffModel: Location_dep_staffs, staffDomainField: "location_dep_id", staffUserField: "user_id" },
};

export const getRoleNameFromRequest = (req: Request) => {
  const raw = req.headers.get("cookie")?.match(/(?:^|; )user_role=([^;]*)/)?.[1];
  try {
    const role = raw ? JSON.parse(decodeURIComponent(raw)) : null;
    return String(role?.role_name || role?.role || "").toUpperCase();
  } catch {
    return "";
  }
};

export async function getHeadStaffIds(userId: string, roleName: string) {
  if (!HEAD_ROLES.includes(roleName)) return [];
  const config = scopeConfigs[roleName];
  if (!config) return [];

  const head = await config.headModel
    .findOne({ user_id: userId, status: 1 })
    .select(config.headDomainField)
    .lean();
  const domainId = head?.[config.headDomainField];
  if (!domainId) return [];

  const staff = await config.staffModel
    .find({ [config.staffDomainField]: domainId, status: 1 })
    .select(config.staffUserField)
    .lean();

  return Array.from(
    new Set(
      staff
        .map((item: any) => item?.[config.staffUserField]?.toString())
        .filter(Boolean)
    )
  );
}

export async function getBusinessHeads(businessId: string) {
  const staff = await Business_staffs.find({ business_id: businessId, status: 1 })
    .populate({ path: "user_id", select: "name email status", match: { status: 1 } })
    .lean();
  const people = staff
    .map((item: any) => item.user_id)
    .filter(Boolean);
  const userIds = people.map((user: any) => user._id);
  if (!userIds.length) return [];

  const roles = await User_roles.find({ user_id: { $in: userIds }, status: 1 })
    .populate("role_id", "role_name")
    .lean();
  const headIds = new Set(
    roles
      .filter((role: any) => HEAD_ROLES.includes(String(role.role_id?.role_name || "")))
      .map((role: any) => role.user_id?.toString())
      .filter(Boolean)
  );

  return people
    .filter((user: any) => headIds.has(user._id.toString()))
    .map((user: any) => ({ id: user._id.toString(), name: user.name || "Unknown user", email: user.email || "" }));
}

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
