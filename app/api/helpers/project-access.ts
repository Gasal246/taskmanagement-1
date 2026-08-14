import AdminAssignBusiness from "@/models/admin_assign_business.model";
import AreaDepHeads from "@/models/area_dep_heads.model";
import AreaDepartments from "@/models/area_departments.model";
import AreaHeads from "@/models/area_heads.model";
import BusinessProject from "@/models/business_project.model";
import BusinessStaffs from "@/models/business_staffs.model";
import LocationDepHeads from "@/models/location_dep_heads.model";
import LocationDepartments from "@/models/location_departments.model";
import LocationHeads from "@/models/location_heads.model";
import ProjectTeamMembers from "@/models/project_team_members.model";
import ProjectTeams from "@/models/project_team.model";
import RegionDepHeads from "@/models/region_dep_heads.model";
import RegionDepartments from "@/models/region_departments.model";
import RegionHeads from "@/models/region_heads.model";
import UserRoles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { auth } from "@/auth";
import { resolveSessionUserId } from "@/lib/utils";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

const id = (value: any) => value?.toString?.() ?? String(value ?? "");

const includesId = (values: any, userId: string) =>
  (Array.isArray(values) ? values : [])
    .filter(Boolean)
    .some((value) => id(value) === userId);

async function hasOrganizationalHeadScope(project: any, userId: string) {
  const activeRoles: any[] = await UserRoles.find({
    user_id: userId,
    business_id: project.business_id,
    status: 1,
  })
    .populate({ path: "role_id", select: "role_name" })
    .lean();

  const roleNames = new Set(
    activeRoles.map((row: any) => row?.role_id?.role_name).filter(Boolean)
  );

  const checks: Promise<boolean>[] = [];

  if (roleNames.has("REGION_HEAD") && project.region_id) {
    checks.push(
      RegionHeads.exists({
        user_id: userId,
        region_id: project.region_id,
        status: 1,
      }).then(Boolean)
    );
  }
  if (roleNames.has("AREA_HEAD") && project.area_id) {
    checks.push(
      AreaHeads.exists({
        user_id: userId,
        area_id: project.area_id,
        status: 1,
      }).then(Boolean)
    );
  }
  if (roleNames.has("LOCATION_HEAD") && project.location_id) {
    checks.push(
      LocationHeads.exists({
        user_id: userId,
        location_id: project.location_id,
        status: 1,
      }).then(Boolean)
    );
  }

  if (roleNames.has("REGION_DEP_HEAD") && project.region_id) {
    checks.push(
      (async () => {
        const assignments: any[] = await RegionDepHeads.find({
          user_id: userId,
          status: 1,
        })
          .select("reg_dep_id")
          .lean();
        if (
          project.department_id &&
          assignments.some(
            (row: any) => id(row.reg_dep_id) === id(project.department_id)
          )
        ) {
          return true;
        }
        const departments: any[] = await RegionDepartments.find({
          _id: { $in: assignments.map((row: any) => row.reg_dep_id) },
          region_id: project.region_id,
          type: project.type,
          status: 1,
        })
          .select("_id")
          .lean();
        return departments.length > 0;
      })()
    );
  }
  if (roleNames.has("AREA_DEP_HEAD") && project.area_id) {
    checks.push(
      (async () => {
        const assignments: any[] = await AreaDepHeads.find({
          user_id: userId,
          status: 1,
        })
          .select("area_dep_id")
          .lean();
        if (
          project.department_id &&
          assignments.some(
            (row: any) => id(row.area_dep_id) === id(project.department_id)
          )
        ) {
          return true;
        }
        const departments: any[] = await AreaDepartments.find({
          _id: { $in: assignments.map((row: any) => row.area_dep_id) },
          area_id: project.area_id,
          type: project.type,
          status: 1,
        })
          .select("_id")
          .lean();
        return departments.length > 0;
      })()
    );
  }
  if (roleNames.has("LOCATION_DEP_HEAD") && project.location_id) {
    checks.push(
      (async () => {
        const assignments: any[] = await LocationDepHeads.find({
          user_id: userId,
          status: 1,
        })
          .select("location_dep_id")
          .lean();
        if (
          project.department_id &&
          assignments.some(
            (row: any) => id(row.location_dep_id) === id(project.department_id)
          )
        ) {
          return true;
        }
        const departments: any[] = await LocationDepartments.find({
          _id: { $in: assignments.map((row: any) => row.location_dep_id) },
          location_id: project.location_id,
          type: project.type,
          status: 1,
        })
          .select("_id")
          .lean();
        return departments.length > 0;
      })()
    );
  }

  if (checks.length === 0) return false;
  return (await Promise.all(checks)).some(Boolean);
}

export type ProjectAccess = {
  project: any;
  canView: boolean;
  canManage: boolean;
  canViewAllTeams: boolean;
  canCreateTasks: boolean;
  canApprove: boolean;
  canDelete: boolean;
  isAdmin: boolean;
};

export async function resolveProjectAccess(
  projectId: string,
  userId: string
): Promise<ProjectAccess | null> {
  const [projectResult, user] = await Promise.all([
    BusinessProject.findById(projectId).lean(),
    Users.findOne({ _id: userId, status: 1 }).select("_id").lean(),
  ]);
  const project: any = projectResult;
  if (!project) return null;
  if (!user) {
    return {
      project,
      canView: false,
      canManage: false,
      canViewAllTeams: false,
      canCreateTasks: false,
      canApprove: false,
      canDelete: false,
      isAdmin: false,
    };
  }

  const businessId = id(project.business_id);
  const [adminAssignment, staffAssignment] = await Promise.all([
    AdminAssignBusiness.exists({
      user_id: userId,
      business_id: businessId,
      status: 1,
    }),
    BusinessStaffs.exists({
      user_id: userId,
      business_id: businessId,
      status: 1,
    }),
  ]);

  const isAdmin = Boolean(adminAssignment);
  const isCreator = id(project.creator) === userId;
  const isProjectHead =
    id(project.project_head) === userId ||
    includesId(project.project_heads, userId);
  const isDirectAssignment =
    isProjectHead ||
    includesId(project.project_supervisors, userId) ||
    includesId(project.account_managers, userId) ||
    includesId(project.site_operational_heads, userId);

  const isScopedHead =
    !isAdmin && staffAssignment && !isCreator && !isProjectHead
      ? await hasOrganizationalHeadScope(project, userId)
      : false;

  let isTeamParticipant = false;
  let isTeamHead = false;
  if (
    staffAssignment &&
    !isCreator &&
    !isDirectAssignment &&
    !isScopedHead
  ) {
    const teams: any[] = await ProjectTeams.find({ project_id: project._id })
      .select("_id team_head")
      .lean();
    isTeamHead = teams.some((team: any) => id(team.team_head) === userId);
    isTeamParticipant = isTeamHead;
    if (!isTeamParticipant && teams.length > 0) {
      isTeamParticipant = Boolean(
        await ProjectTeamMembers.exists({
          project_team_id: { $in: teams.map((team: any) => team._id) },
          user_id: userId,
        })
      );
    }
  }

  const canView =
    isAdmin ||
    Boolean(staffAssignment) &&
      (isCreator || isDirectAssignment || isTeamParticipant || isScopedHead);
  const canManage =
    isAdmin ||
    Boolean(staffAssignment) && (isCreator || isProjectHead || isScopedHead);
  const canViewAllTeams = canManage || isDirectAssignment;
  const canCreateTasks =
    isAdmin ||
    (Boolean(staffAssignment) &&
      (isCreator || isDirectAssignment || isScopedHead || isTeamHead));

  return {
    project,
    canView,
    canManage,
    canViewAllTeams,
    canCreateTasks,
    canApprove: isAdmin,
    canDelete: isAdmin,
    isAdmin,
  };
}

export async function authorizeProjectRequest(
  projectId: string,
  requirement: "view" | "manage" | "approve" | "delete" = "view"
): Promise<
  | { ok: true; access: ProjectAccess; userId: string }
  | { ok: false; response: NextResponse }
> {
  const session: any = await auth();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Un-Authorized Access" },
        { status: 401 }
      ),
    };
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Invalid project id" },
        { status: 400 }
      ),
    };
  }

  const userId = resolveSessionUserId(session);
  const access = await resolveProjectAccess(projectId, userId);
  if (!access) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Project not found" },
        { status: 404 }
      ),
    };
  }
  const allowed =
    requirement === "view"
      ? access.canView
      : requirement === "manage"
        ? access.canManage
        : requirement === "approve"
          ? access.canApprove
          : access.canDelete;
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, access, userId };
}

export async function isActiveStaffInProjectBusiness(
  project: any,
  userId: string
) {
  const [staff, user] = await Promise.all([
    BusinessStaffs.exists({
      user_id: userId,
      business_id: project?.business_id,
      status: 1,
    }),
    Users.exists({ _id: userId, status: 1 }),
  ]);
  return Boolean(staff && user);
}
