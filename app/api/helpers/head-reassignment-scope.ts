import { HEAD_ROLES } from "@/lib/constants";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Area_departments from "@/models/area_departments.model";
import Area_heads from "@/models/area_heads.model";
import Area_staffs from "@/models/area_staffs.model";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import Business_regions from "@/models/business_regions.model";
import Business_staffs from "@/models/business_staffs.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Location_departments from "@/models/location_departments.model";
import Location_heads from "@/models/location_heads.model";
import Location_staffs from "@/models/location_staffs.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Region_departments from "@/models/region_departments.model";
import Region_heads from "@/models/region_heads.model";
import Region_staffs from "@/models/region_staffs.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import "@/models/roles.model";

type HeadLevel = "REGION" | "AREA" | "LOCATION";

export type SelectedHeadContext = {
  userId: string;
  roleId: string;
  roleName: string;
  businessId: string;
  level: HeadLevel;
  selectedAssignmentId: string;
  selectedDomainId: string;
  regionId: string | null;
  areaId: string | null;
  locationId: string | null;
};

export type ReassignmentHeadDomain = {
  id: string;
  name: string;
  level: HeadLevel;
  role_name: string;
};

export type ReassignmentHead = {
  _id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  domains: ReassignmentHeadDomain[];
};

const parseCookie = (req: Request, name: string) => {
  const cookieHeader = req.headers.get("cookie") || "";
  const rawValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

  if (!rawValue) return null;
  try {
    return JSON.parse(decodeURIComponent(rawValue));
  } catch {
    return null;
  }
};

const idString = (value: any) => value?.toString?.() || "";

const matchesCookieId = (cookieValue: any, databaseValue: any) =>
  Boolean(cookieValue) && idString(cookieValue) === idString(databaseValue);

export async function resolveSelectedHeadContext(
  req: Request,
  userId: string,
  requiredBusinessId?: string
): Promise<SelectedHeadContext | null> {
  const roleCookie = parseCookie(req, "user_role");
  const domainCookie = parseCookie(req, "user_domain");
  const roleId = idString(roleCookie?._id);
  const cookieRoleName = String(roleCookie?.role_name || "").toUpperCase();
  const selectedAssignmentId = idString(domainCookie?.value);
  const cookieBusinessId = idString(domainCookie?.business_id);

  if (
    !roleId ||
    !selectedAssignmentId ||
    !cookieBusinessId ||
    !HEAD_ROLES.includes(cookieRoleName)
  ) {
    return null;
  }

  const userRole: any = await User_roles.findOne({
    user_id: userId,
    role_id: roleId,
    status: 1,
    $or: [{ business_id: cookieBusinessId }, { business_id: null }],
  })
    .populate("role_id", "role_name")
    .lean();
  const roleName = String(userRole?.role_id?.role_name || "").toUpperCase();
  if (roleName !== cookieRoleName || !HEAD_ROLES.includes(roleName)) return null;
  if (userRole?.business_id && idString(userRole.business_id) !== cookieBusinessId) {
    return null;
  }
  if (requiredBusinessId && cookieBusinessId !== idString(requiredBusinessId)) return null;

  const activeMembership = await Business_staffs.exists({
    user_id: userId,
    business_id: cookieBusinessId,
    status: 1,
  });
  if (!activeMembership) return null;

  let level: HeadLevel;
  let selectedDomainId = "";
  let regionId: string | null = null;
  let areaId: string | null = null;
  let locationId: string | null = null;
  let resolvedBusinessId = "";

  if (roleName === "REGION_HEAD") {
    const assignment: any = await Region_heads.findOne({
      _id: selectedAssignmentId,
      user_id: userId,
      status: 1,
    }).lean();
    const region: any = assignment?.region_id
      ? await Business_regions.findOne({ _id: assignment.region_id, status: 1 }).lean()
      : null;
    if (!assignment || !region || !matchesCookieId(domainCookie?.region_id, region._id)) return null;
    level = "REGION";
    selectedDomainId = idString(region._id);
    regionId = selectedDomainId;
    resolvedBusinessId = idString(region.business_id);
  } else if (roleName === "REGION_DEP_HEAD") {
    const assignment: any = await Region_dep_heads.findOne({
      _id: selectedAssignmentId,
      user_id: userId,
      status: 1,
    }).lean();
    const department: any = assignment?.reg_dep_id
      ? await Region_departments.findOne({ _id: assignment.reg_dep_id, status: 1 }).lean()
      : null;
    const region: any = department?.region_id
      ? await Business_regions.findOne({ _id: department.region_id, status: 1 }).lean()
      : null;
    if (
      !assignment ||
      !department ||
      !region ||
      !matchesCookieId(domainCookie?.department_id, department._id)
    ) {
      return null;
    }
    level = "REGION";
    selectedDomainId = idString(department._id);
    regionId = idString(region._id);
    resolvedBusinessId = idString(region.business_id);
  } else if (roleName === "AREA_HEAD") {
    const assignment: any = await Area_heads.findOne({
      _id: selectedAssignmentId,
      user_id: userId,
      status: 1,
    }).lean();
    const area: any = assignment?.area_id
      ? await Business_areas.findOne({ _id: assignment.area_id, status: 1 }).lean()
      : null;
    if (!assignment || !area || !matchesCookieId(domainCookie?.area_id, area._id)) return null;
    level = "AREA";
    selectedDomainId = idString(area._id);
    areaId = selectedDomainId;
    regionId = idString(area.region_id) || null;
    resolvedBusinessId = idString(area.business_id);
  } else if (roleName === "AREA_DEP_HEAD") {
    const assignment: any = await Area_dep_heads.findOne({
      _id: selectedAssignmentId,
      user_id: userId,
      status: 1,
    }).lean();
    const department: any = assignment?.area_dep_id
      ? await Area_departments.findOne({ _id: assignment.area_dep_id, status: 1 }).lean()
      : null;
    const area: any = department?.area_id
      ? await Business_areas.findOne({ _id: department.area_id, status: 1 }).lean()
      : null;
    if (
      !assignment ||
      !department ||
      !area ||
      !matchesCookieId(domainCookie?.department_id, department._id)
    ) {
      return null;
    }
    level = "AREA";
    selectedDomainId = idString(department._id);
    areaId = idString(area._id);
    regionId = idString(area.region_id) || null;
    resolvedBusinessId = idString(area.business_id);
  } else if (roleName === "LOCATION_HEAD") {
    const assignment: any = await Location_heads.findOne({
      _id: selectedAssignmentId,
      user_id: userId,
      status: 1,
    }).lean();
    const location: any = assignment?.location_id
      ? await Business_locations.findOne({ _id: assignment.location_id, status: 1 }).lean()
      : null;
    if (
      !assignment ||
      !location ||
      !matchesCookieId(domainCookie?.location_id, location._id)
    ) {
      return null;
    }
    level = "LOCATION";
    selectedDomainId = idString(location._id);
    locationId = selectedDomainId;
    areaId = idString(location.area_id) || null;
    regionId = idString(location.region_id) || null;
    resolvedBusinessId = idString(location.business_id);
  } else {
    const assignment: any = await Location_dep_heads.findOne({
      _id: selectedAssignmentId,
      user_id: userId,
      status: 1,
    }).lean();
    const department: any = assignment?.location_dep_id
      ? await Location_departments.findOne({
          _id: assignment.location_dep_id,
          status: 1,
        }).lean()
      : null;
    const location: any = department?.location_id
      ? await Business_locations.findOne({ _id: department.location_id, status: 1 }).lean()
      : null;
    if (
      roleName !== "LOCATION_DEP_HEAD" ||
      !assignment ||
      !department ||
      !location ||
      !matchesCookieId(domainCookie?.department_id, department._id)
    ) {
      return null;
    }
    level = "LOCATION";
    selectedDomainId = idString(department._id);
    locationId = idString(location._id);
    areaId = idString(location.area_id) || idString(department.area_id) || null;
    regionId = idString(location.region_id) || idString(department.region_id) || null;
    resolvedBusinessId = idString(location.business_id);
  }

  if (!resolvedBusinessId || resolvedBusinessId !== cookieBusinessId) return null;

  return {
    userId,
    roleId,
    roleName,
    businessId: resolvedBusinessId,
    level,
    selectedAssignmentId,
    selectedDomainId,
    regionId,
    areaId,
    locationId,
  };
}

export async function getSelectedHeadDirectStaffIds(context: SelectedHeadContext) {
  const config: Record<
    string,
    { model: any; domainField: string; userField: string }
  > = {
    REGION_HEAD: {
      model: Region_staffs,
      domainField: "region_id",
      userField: "staff_id",
    },
    REGION_DEP_HEAD: {
      model: Region_dep_staffs,
      domainField: "region_dep_id",
      userField: "user_id",
    },
    AREA_HEAD: {
      model: Area_staffs,
      domainField: "area_id",
      userField: "staff_id",
    },
    AREA_DEP_HEAD: {
      model: Area_dep_staffs,
      domainField: "area_dep_id",
      userField: "user_id",
    },
    LOCATION_HEAD: {
      model: Location_staffs,
      domainField: "location_id",
      userField: "user_id",
    },
    LOCATION_DEP_HEAD: {
      model: Location_dep_staffs,
      domainField: "location_dep_id",
      userField: "user_id",
    },
  };
  const selected = config[context.roleName];
  if (!selected) return [];

  const records = await selected.model
    .find({ [selected.domainField]: context.selectedDomainId, status: 1 })
    .select(selected.userField)
    .lean();
  const candidateIds = Array.from(
    new Set(
      records
        .map((record: any) => idString(record?.[selected.userField]))
        .filter(Boolean)
    )
  );
  if (!candidateIds.length) return [];

  const activeUsers = await Users.find({
    _id: { $in: candidateIds },
    status: 1,
  })
    .select("_id")
    .lean();
  return activeUsers.map((user: any) => idString(user._id));
}

export async function getHierarchyReassignmentHeads(
  context: SelectedHeadContext
): Promise<ReassignmentHead[]> {
  let regions: any[] = [];
  let areas: any[] = [];
  let locations: any[] = [];

  if (context.level === "REGION" && context.regionId) {
    const [regionRecords, areaRecords] = await Promise.all([
      Business_regions.find({
        _id: context.regionId,
        business_id: context.businessId,
        status: 1,
      }).lean(),
      Business_areas.find({
        region_id: context.regionId,
        business_id: context.businessId,
        status: 1,
      }).lean(),
    ]);
    regions = regionRecords;
    areas = areaRecords;
    const areaIds = areas.map((area) => area._id);
    locations = areaIds.length
      ? await Business_locations.find({
          area_id: { $in: areaIds },
          business_id: context.businessId,
          status: 1,
        }).lean()
      : [];
  } else if (context.level === "AREA" && context.areaId) {
    areas = await Business_areas.find({
      _id: context.areaId,
      business_id: context.businessId,
      status: 1,
    }).lean();
    locations = await Business_locations.find({
      area_id: context.areaId,
      business_id: context.businessId,
      status: 1,
    }).lean();
  } else if (context.level === "LOCATION" && context.locationId) {
    locations = await Business_locations.find({
      _id: context.locationId,
      business_id: context.businessId,
      status: 1,
    }).lean();
  }

  const regionIds = regions.map((region) => idString(region._id));
  const areaIds = areas.map((area) => idString(area._id));
  const locationIds = locations.map((location) => idString(location._id));
  const [regionDepartments, areaDepartments, locationDepartments] =
    await Promise.all([
      regionIds.length
        ? Region_departments.find({
            region_id: { $in: regionIds },
            status: 1,
          }).lean()
        : [],
      areaIds.length
        ? Area_departments.find({
            area_id: { $in: areaIds },
            business_id: context.businessId,
            status: 1,
          }).lean()
        : [],
      locationIds.length
        ? Location_departments.find({
            location_id: { $in: locationIds },
            status: 1,
          }).lean()
        : [],
    ]);

  const regionDepartmentIds = regionDepartments.map((item: any) => idString(item._id));
  const areaDepartmentIds = areaDepartments.map((item: any) => idString(item._id));
  const locationDepartmentIds = locationDepartments.map((item: any) =>
    idString(item._id)
  );

  const [
    regionHeadRecords,
    regionDepartmentHeadRecords,
    areaHeadRecords,
    areaDepartmentHeadRecords,
    locationHeadRecords,
    locationDepartmentHeadRecords,
  ] = await Promise.all([
    regionIds.length
      ? Region_heads.find({ region_id: { $in: regionIds }, status: 1 }).lean()
      : [],
    regionDepartmentIds.length
      ? Region_dep_heads.find({
          reg_dep_id: { $in: regionDepartmentIds },
          status: 1,
        }).lean()
      : [],
    areaIds.length
      ? Area_heads.find({ area_id: { $in: areaIds }, status: 1 }).lean()
      : [],
    areaDepartmentIds.length
      ? Area_dep_heads.find({
          area_dep_id: { $in: areaDepartmentIds },
          status: 1,
        }).lean()
      : [],
    locationIds.length
      ? Location_heads.find({
          location_id: { $in: locationIds },
          status: 1,
        }).lean()
      : [],
    locationDepartmentIds.length
      ? Location_dep_heads.find({
          location_dep_id: { $in: locationDepartmentIds },
          status: 1,
        }).lean()
      : [],
  ]);

  const domainMaps = {
    REGION_HEAD: new Map(
      regions.map((item) => [
        idString(item._id),
        { name: item.region_name || "Region", level: "REGION" as HeadLevel },
      ])
    ),
    REGION_DEP_HEAD: new Map(
      regionDepartments.map((item: any) => [
        idString(item._id),
        { name: item.dep_name || "Department", level: "REGION" as HeadLevel },
      ])
    ),
    AREA_HEAD: new Map(
      areas.map((item) => [
        idString(item._id),
        { name: item.area_name || "Area", level: "AREA" as HeadLevel },
      ])
    ),
    AREA_DEP_HEAD: new Map(
      areaDepartments.map((item: any) => [
        idString(item._id),
        { name: item.dep_name || "Department", level: "AREA" as HeadLevel },
      ])
    ),
    LOCATION_HEAD: new Map(
      locations.map((item) => [
        idString(item._id),
        {
          name: item.location_name || "Location",
          level: "LOCATION" as HeadLevel,
        },
      ])
    ),
    LOCATION_DEP_HEAD: new Map(
      locationDepartments.map((item: any) => [
        idString(item._id),
        {
          name: item.dep_name || "Department",
          level: "LOCATION" as HeadLevel,
        },
      ])
    ),
  };

  const assignments = [
    ...regionHeadRecords.map((item: any) => ({
      userId: idString(item.user_id),
      domainId: idString(item.region_id),
      roleName: "REGION_HEAD",
    })),
    ...regionDepartmentHeadRecords.map((item: any) => ({
      userId: idString(item.user_id),
      domainId: idString(item.reg_dep_id),
      roleName: "REGION_DEP_HEAD",
    })),
    ...areaHeadRecords.map((item: any) => ({
      userId: idString(item.user_id),
      domainId: idString(item.area_id),
      roleName: "AREA_HEAD",
    })),
    ...areaDepartmentHeadRecords.map((item: any) => ({
      userId: idString(item.user_id),
      domainId: idString(item.area_dep_id),
      roleName: "AREA_DEP_HEAD",
    })),
    ...locationHeadRecords.map((item: any) => ({
      userId: idString(item.user_id),
      domainId: idString(item.location_id),
      roleName: "LOCATION_HEAD",
    })),
    ...locationDepartmentHeadRecords.map((item: any) => ({
      userId: idString(item.user_id),
      domainId: idString(item.location_dep_id),
      roleName: "LOCATION_DEP_HEAD",
    })),
  ].filter((item) => item.userId && item.userId !== context.userId);

  const userIds = Array.from(new Set(assignments.map((item) => item.userId)));
  if (!userIds.length) return [];

  const [users, memberships, roles] = await Promise.all([
    Users.find({ _id: { $in: userIds }, status: 1 })
      .select("name email avatar_url")
      .lean(),
    Business_staffs.find({
      user_id: { $in: userIds },
      business_id: context.businessId,
      status: 1,
    })
      .select("user_id")
      .lean(),
    User_roles.find({
      user_id: { $in: userIds },
      status: 1,
    })
      .populate("role_id", "role_name")
      .lean(),
  ]);

  const memberIds = new Set(memberships.map((item: any) => idString(item.user_id)));
  const activeRolesByUser = new Map<string, Set<string>>();
  for (const role of roles as any[]) {
    const roleName = String(role?.role_id?.role_name || "").toUpperCase();
    if (!HEAD_ROLES.includes(roleName)) continue;
    if (role?.business_id && idString(role.business_id) !== context.businessId) {
      continue;
    }
    const key = idString(role.user_id);
    const userRoles = activeRolesByUser.get(key) || new Set<string>();
    userRoles.add(roleName);
    activeRolesByUser.set(key, userRoles);
  }

  const usersById = new Map(
    users
      .filter((user: any) => memberIds.has(idString(user._id)))
      .map((user: any) => [idString(user._id), user])
  );
  const resultByUser = new Map<string, ReassignmentHead>();

  for (const assignment of assignments) {
    const user = usersById.get(assignment.userId);
    if (!user || !activeRolesByUser.get(assignment.userId)?.has(assignment.roleName)) {
      continue;
    }
    const roleDomainMap =
      domainMaps[assignment.roleName as keyof typeof domainMaps];
    const domain = roleDomainMap.get(assignment.domainId);
    if (!domain) continue;

    const existing: ReassignmentHead =
      resultByUser.get(assignment.userId) ||
      {
        _id: assignment.userId,
        name: user.name || "",
        email: user.email || "",
        avatar_url: user.avatar_url || null,
        domains: [],
      };
    const domainKey = `${assignment.roleName}:${assignment.domainId}`;
    const alreadyIncluded = existing.domains.some(
      (item) => `${item.role_name}:${item.id}` === domainKey
    );
    if (!alreadyIncluded) {
      existing.domains.push({
        id: assignment.domainId,
        name: String(domain.name),
        level: domain.level,
        role_name: assignment.roleName,
      });
    }
    resultByUser.set(assignment.userId, existing);
  }

  return Array.from(resultByUser.values())
    .map((head) => ({
      ...head,
      domains: head.domains.sort(
        (first, second) =>
          first.level.localeCompare(second.level) ||
          first.name.localeCompare(second.name)
      ),
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}
