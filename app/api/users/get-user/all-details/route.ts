import { temporaryDatabaseFailureResponse } from "@/lib/auth-availability";
import { DashboardAccessError, resolveDashboardScope } from "@/lib/dashboard-access";
import { auth } from "@/auth";

import connectDB from "@/lib/mongo";
import Area_staffs from "@/models/area_staffs.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Business_Project from "@/models/business_project.model";
import Business_Tasks from "@/models/business_tasks.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Location_staffs from "@/models/location_staffs.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Project_Teams from "@/models/project_team.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Region_staffs from "@/models/region_staffs.model";
import "@/models/roles.model"
import "@/models/business_clients.model";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { dashboardOrganizationLabels } from "@/lib/dashboard-organization";
import Users from "@/models/users.model";

const HEAD_ROLES = new Set([
  "REGION_HEAD",
  "AREA_HEAD",
  "LOCATION_HEAD",
  "REGION_DEP_HEAD",
  "AREA_DEP_HEAD",
  "LOCATION_DEP_HEAD",
]);

const STAFF_PROJECT_ROLES = new Set([
  "REGION_STAFF",
  "AREA_STAFF",
  "LOCATION_STAFF",
  "REGION_DEP_STAFF",
  "AREA_DEP_STAFF",
  "LOCATION_DEP_STAFF",
  "AGENT",
]);

async function getHeadStaffCount(roleName: string, orgId?: string | null) {
  if (!orgId || !HEAD_ROLES.has(roleName)) return null;

  switch (roleName) {
    case "REGION_HEAD":
      return Region_staffs.countDocuments({ region_id: orgId, status: 1 });
    case "AREA_HEAD":
      return Area_staffs.countDocuments({ area_id: orgId, status: 1 });
    case "LOCATION_HEAD":
      return Location_staffs.countDocuments({ location_id: orgId, status: 1 });
    case "REGION_DEP_HEAD":
      return Region_dep_staffs.countDocuments({ region_dep_id: orgId, status: 1 });
    case "AREA_DEP_HEAD":
      return Area_dep_staffs.countDocuments({ area_dep_id: orgId, status: 1 });
    case "LOCATION_DEP_HEAD":
      return Location_dep_staffs.countDocuments({ location_dep_id: orgId, status: 1 });
    default:
      return null;
  }
}

async function getUserTeams(userId: string) {
  const [memberships, headedTeams] = await Promise.all([
    Project_Team_Members.find({ user_id: userId }).select("project_team_id").lean(),
    Project_Teams.find({ team_head: userId }).select("_id").lean(),
  ]);
  const membershipIds = memberships.map((row: any) => row.project_team_id).filter(Boolean);
  const taskTeamIds = [...new Set([...membershipIds, ...headedTeams.map((row: any) => row._id)].map(String))]
    .map(id => new mongoose.Types.ObjectId(id));
  return { membershipIds, taskTeamIds };
}

async function getTaskCounts(userId: string, businessId: string, teamIds: mongoose.Types.ObjectId[]) {
  // Aggregation does not cast IDs as Mongoose find/count queries do.
  const user = new mongoose.Types.ObjectId(userId);
  const taskScope: any[] = [{ assigned_to: user }, { creator: user }];
  if (teamIds.length) taskScope.push({ assigned_teams: { $in: teamIds } });
  const counts = await Business_Tasks.aggregate([
    { $match: { business_id: new mongoose.Types.ObjectId(businessId), $or: taskScope,
      status: { $in: ["To Do", "In Progress", "Completed"] } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(counts.map(row => [row._id, row.count]));
  return { pendingTasks: (byStatus["To Do"] || 0) + (byStatus["In Progress"] || 0), completedTasks: byStatus.Completed || 0 };
}

async function getProjectQuery(roleName: string, orgId: string | null, userId: string, resource: any, membershipIds: any[]) {
  const geographicField: Record<string, string> = { REGION_HEAD: "region_id", AREA_HEAD: "area_id", LOCATION_HEAD: "location_id",
    REGION_DEP_HEAD: "region_id", AREA_DEP_HEAD: "area_id", LOCATION_DEP_HEAD: "location_id" };
  const field = geographicField[roleName];
  if (field) {
    if (roleName.includes("_DEP_")) return resource[field] && resource.type
      ? { [field]: resource[field], type: resource.type } : { creator: userId };
    return orgId ? { [field]: orgId } : { creator: userId };
  }
  if (!STAFF_PROJECT_ROLES.has(roleName) || !membershipIds.length) return { creator: userId };
  // Project visibility historically uses memberships, while task visibility also includes headed teams.
  const teams = await Project_Teams.find({ _id: { $in: membershipIds } }).select("project_id").lean();
  const projectIds = teams.map((team: any) => team.project_id).filter(Boolean);
  return projectIds.length ? { $or: [{ _id: { $in: projectIds } }, { creator: userId }] } : { creator: userId };
}

async function getDashboardData(roleName: string, orgId: string | null, userId: string, businessId: string, resource: any) {
  const teams = getUserTeams(userId);
  const [staffCount, taskCounts, projectQuery] = await Promise.all([
    getHeadStaffCount(roleName, orgId),
    teams.then(({ taskTeamIds }) => getTaskCounts(userId, businessId, taskTeamIds)),
    teams.then(({ membershipIds }) => getProjectQuery(roleName, orgId, userId, resource, membershipIds)),
  ]);

  const scopedProjectQuery = { $and: [projectQuery, { business_id: businessId }] };
  const [projectCount, projects] = await Promise.all([
    Business_Project.countDocuments(scopedProjectQuery),
    Business_Project.find(scopedProjectQuery)
      .select("project_name project_description status is_approved start_date end_date type task_count completed_task_count client_id region_id area_id location_id")
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .limit(4)
      .populate("client_id", "client_name")
      .populate("region_id", "region_name")
      .populate("area_id", "area_name")
      .populate("location_id", "location_name")
      .lean(),
  ]);

  return {
    ...taskCounts,
    staffCount,
    projectCount,
    projects: projects.map((project: any) => {
      const totalTasks = Number(project?.task_count || 0);
      const completedTaskCount = Number(project?.completed_task_count || 0);
      const progress = totalTasks > 0 ? Math.round((completedTaskCount / totalTasks) * 100) : 0;

      return {
        _id: project?._id,
        project_name: project?.project_name,
        project_description: project?.project_description,
        status: project?.status,
        is_approved: project?.is_approved,
        start_date: project?.start_date,
        end_date: project?.end_date,
        type: project?.type,
        task_count: totalTasks,
        completed_task_count: completedTaskCount,
        progress,
        client_name: project?.client_id?.client_name || null,
        region_name: project?.region_id?.region_name || null,
        area_name: project?.area_id?.area_name || null,
        location_name: project?.location_id?.location_name || null,
      };
    }),
  };
}

export async function GET(req:NextRequest){
  try{
        await connectDB();
    const {searchParams} = new URL(req.url);
    const role_id = searchParams.get("role_id");
    const org_id = searchParams.get("org_id");
    
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const scope = await resolveDashboardScope(session.user.id, role_id, org_id, Boolean(session.user.is_super));
    const [user_name, dashboard, labels] = await Promise.all([
      Users.findById(session.user.id).select("name").lean(),
      getDashboardData(scope.roleName, org_id, session.user.id, scope.businessId, scope.resource),
      dashboardOrganizationLabels(scope.roleName, scope.resource),
    ]);
    return NextResponse.json({ data: { ...labels, role: scope.roleName, user_name, dashboard }, status: 200 });

  }catch(err){
    const unavailable = temporaryDatabaseFailureResponse(err);
    if (unavailable) return unavailable;
    if (err instanceof DashboardAccessError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.log("error while getting user-all-details: ", err);
    return NextResponse.json({message:"Internal Server Error", status:500}, {status:500});
  }

}
