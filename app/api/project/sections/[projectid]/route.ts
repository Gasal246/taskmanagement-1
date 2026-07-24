import { auth } from "@/auth";
import { resolveProjectAccess } from "@/app/api/helpers/project-access";
import connectDB from "@/lib/mongo";
import { resolveSessionUserId } from "@/lib/utils";
import BusinessStaffs from "@/models/business_staffs.model";
import FlowLog from "@/models/Flow_Log.model";
import ProjectDepartments from "@/models/project_departments.model";
import ProjectDocs from "@/models/project_docs.model";
import ProjectTeamMembers from "@/models/project_team_members.model";
import ProjectTeams from "@/models/project_team.model";
import Users from "@/models/users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import "@/models/users.model";
import "@/models/project_departments.model";

connectDB();

const validSections = new Set([
  "operations",
  "flow",
  "teams",
  "departments",
  "docs",
  "assignment-candidates",
  "document-viewers",
]);

const id = (value: any) => value?.toString?.() ?? String(value ?? "");

const uniqueIds = (values: any[]) =>
  Array.from(new Set(values.filter(Boolean).map(id))).filter((value) =>
    mongoose.Types.ObjectId.isValid(value)
  );

async function getPeople(ids: string[]) {
  if (ids.length === 0) return [];
  const people: any[] = await Users.find({
    _id: { $in: ids },
    status: 1,
  })
    .select("name email avatar_url")
    .lean();
  const peopleMap = new Map(people.map((person: any) => [id(person._id), person]));
  return ids.map((personId) => peopleMap.get(personId)).filter(Boolean);
}

async function getTeams(projectId: string, userId: string, canManage: boolean) {
  let teamQuery: any = { project_id: projectId };
  if (!canManage) {
    const memberships: any[] = await ProjectTeamMembers.find({ user_id: userId })
      .select("project_team_id")
      .lean();
    teamQuery = {
      project_id: projectId,
      $or: [
        { team_head: userId },
        { _id: { $in: memberships.map((row: any) => row.project_team_id) } },
      ],
    };
  }

  const teams: any[] = await ProjectTeams.find(teamQuery)
    .populate("team_head", "name email avatar_url")
    .populate("project_dept_id", "department_name")
    .lean();
  if (teams.length === 0) return [];

  const members: any[] = await ProjectTeamMembers.find({
    project_team_id: { $in: teams.map((team: any) => team._id) },
  })
    .populate("user_id", "name email avatar_url")
    .lean();
  const membersByTeam = new Map<string, any[]>();
  members.forEach((member: any) => {
    const teamId = id(member.project_team_id);
    membersByTeam.set(teamId, [...(membersByTeam.get(teamId) || []), member]);
  });
  return teams.map((team: any) => ({
    ...team,
    members: membersByTeam.get(id(team._id)) || [],
  }));
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectid: string }> }
) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Un-Authorized Access" }, { status: 401 });
    }

    const { projectid } = await context.params;
    const section = new URL(req.url).searchParams.get("section") || "";
    if (!mongoose.Types.ObjectId.isValid(projectid) || !validSections.has(section)) {
      return NextResponse.json(
        { message: "Invalid project id or section" },
        { status: 400 }
      );
    }

    const userId = resolveSessionUserId(session);
    const access = await resolveProjectAccess(projectid, userId);
    if (!access) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }
    if (!access.canView) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (
      (section === "assignment-candidates" ||
        section === "document-viewers") &&
      !access.canManage
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    switch (section) {
      case "operations": {
        const project = access.project;
        const projectHeadIds = uniqueIds([
          ...(Array.isArray(project.project_heads) ? project.project_heads : []),
          project.project_head,
        ]);
        const supervisorIds = uniqueIds(project.project_supervisors || []);
        const accountManagerIds = uniqueIds(project.account_managers || []);
        const operationalHeadIds = uniqueIds(project.site_operational_heads || []);
        const allPeople = await getPeople(
          uniqueIds([
            ...projectHeadIds,
            ...supervisorIds,
            ...accountManagerIds,
            ...operationalHeadIds,
          ])
        );
        const peopleMap = new Map(
          allPeople.map((person: any) => [id(person._id), person])
        );
        const mapPeople = (ids: string[]) =>
          ids.map((personId) => peopleMap.get(personId)).filter(Boolean);

        return NextResponse.json({
          data: {
            project_heads: mapPeople(projectHeadIds),
            project_supervisors: mapPeople(supervisorIds),
            account_managers: mapPeople(accountManagerIds),
            site_operational_heads: mapPeople(operationalHeadIds),
          },
        });
      }
      case "flow": {
        const flows = await FlowLog.find({ project_id: projectid })
          .sort({ createdAt: -1 })
          .limit(3)
          .lean();
        return NextResponse.json({ data: flows });
      }
      case "teams":
        return NextResponse.json({
          data: await getTeams(projectid, userId, access.canManage),
        });
      case "departments": {
        const departments = await ProjectDepartments.find({
          project_id: projectid,
        })
          .select("department_id department_name is_active")
          .lean();
        return NextResponse.json({ data: departments });
      }
      case "docs": {
        const visibility = access.canManage
          ? {}
          : {
              $or: [
                { access_type: { $ne: "private" } },
                { access_to: userId },
              ],
            };
        const documents = await ProjectDocs.find({
          project_id: projectid,
          status: { $ne: 0 },
          ...visibility,
        })
          .sort({ createdAt: -1 })
          .populate("access_to", "name email avatar_url")
          .lean();
        return NextResponse.json({ data: documents });
      }
      case "assignment-candidates": {
        const staffRows: any[] = await BusinessStaffs.find({
          business_id: access.project.business_id,
          status: 1,
        })
          .populate({
            path: "user_id",
            match: { status: 1 },
            select: "name email avatar_url",
          })
          .lean();
        return NextResponse.json({
          data: staffRows.filter((row: any) => row.user_id),
        });
      }
      case "document-viewers": {
        const teams = await getTeams(projectid, userId, true);
        const peopleIds = uniqueIds(
          teams.flatMap((team: any) => [
            team.team_head?._id,
            ...(team.members || []).map((member: any) => member.user_id?._id),
          ])
        );
        return NextResponse.json({ data: await getPeople(peopleIds) });
      }
      default:
        return NextResponse.json({ message: "Invalid section" }, { status: 400 });
    }
  } catch (error) {
    console.log("Error while fetching project section", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
