import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Business_Project from "@/models/business_project.model";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Project_Departments from "@/models/project_departments.model";
import Project_Teams from "@/models/project_team.model";
import Project_Docs from "@/models/project_docs.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Business_staffs from "@/models/business_staffs.model";
import Business_regions from "@/models/business_regions.model";
import Business_areas from "@/models/business_areas.model";
import Users from "@/models/users.model";
import User_roles from "@/models/user_roles.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
    try {
        const session: any = await auth();
        if (!session) {
            return NextResponse.json({ message: "Un-Authorized Access", status: 401 }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const projectid = searchParams.get("project_id");

        if (!projectid || !mongoose.Types.ObjectId.isValid(projectid)) {
            return NextResponse.json({ message: "Invalid project id" }, { status: 400 });
        }

        const project = await Business_Project.findById(projectid);
        if (!project) {
            return NextResponse.json({ message: "Project not found" }, { status: 404 });
        }

        const projectObj: any = project.toObject();

        try {
            if (mongoose.Types.ObjectId.isValid(project?.region_id)) {
                const region = await Business_regions.findById(project.region_id)
                    .select("region_name")
                    .lean();
                projectObj.region = region || null;
            } else {
                projectObj.region = null;
            }
        } catch (err) {
            console.log("Error while fetching project region: ", err);
            projectObj.region = null;
        }

        try {
            if (mongoose.Types.ObjectId.isValid(project?.area_id)) {
                const area = await Business_areas.findById(project.area_id)
                    .select("area_name region_id")
                    .lean();
                projectObj.area = area || null;
            } else {
                projectObj.area = null;
            }
        } catch (err) {
            console.log("Error while fetching project area: ", err);
            projectObj.area = null;
        }

        const departments = await Project_Departments.find({ project_id: projectid })
            .select("department_name is_active")
            .catch((err) => {
                console.log("Error while fetching project departments: ", err);
                return [];
            });
        if (departments.length > 0) projectObj.departments = departments;

        const teams = await Project_Teams.find({ project_id: projectid })
            .select("team_name")
            .catch((err) => {
                console.log("Error while fetching project teams: ", err);
                return [];
            });
        if (teams.length > 0) projectObj.teams = teams;

        const tasks = await Business_Tasks.find({ project_id: project._id }, { task_name: 1, status: 1 }).catch(
            (err) => {
                console.log("Error while fetching project tasks: ", err);
                return [];
            }
        );
        if (tasks.length > 0) projectObj.tasks = tasks;

        const flow = await Flow_Log.find({ project_id: projectid })
            .sort({ createdAt: -1 })
            .limit(3)
            .catch((err) => {
                console.log("Error while fetching project flows: ", err);
                return [];
            });
        if (flow.length > 0) projectObj.flows = flow;

        let roleMap = new Map<string, string[]>();
        let projectUsers: any[] = [];
        try {
            const staffUserIds: string[] = [];
            if (mongoose.Types.ObjectId.isValid(project?.business_id)) {
                const businessStaffs = await Business_staffs.find({
                    business_id: project?.business_id,
                    status: { $ne: 0 },
                }).select("user_id");
                staffUserIds.push(
                    ...businessStaffs
                        .map((bs) => bs.user_id)
                        .filter(Boolean)
                        .map((id: any) => id.toString())
                );
            }
            if (mongoose.Types.ObjectId.isValid(project?.creator)) staffUserIds.push(project.creator.toString());
            if (mongoose.Types.ObjectId.isValid(project?.admin_id)) staffUserIds.push(project.admin_id.toString());
            const uniqueStaffIds = [...new Set(staffUserIds.filter((id) => mongoose.Types.ObjectId.isValid(id)))];

            if (uniqueStaffIds.length > 0) {
                const roles = await User_roles.find({ user_id: { $in: uniqueStaffIds } })
                    .populate({
                        path: "role_id",
                        select: { role_name: 1 },
                    })
                    .lean();
                roles.forEach((ur: any) => {
                    const uid = ur?.user_id?.toString?.();
                    const roleName = ur?.role_id?.role_name;
                    if (!uid || !roleName) return;
                    const existing = roleMap.get(uid) || [];
                    roleMap.set(uid, [...existing, roleName]);
                });

                const people = await Users.find({ _id: { $in: uniqueStaffIds }, status: 1 })
                    .select({ name: 1, email: 1, avatar_url: 1 })
                    .lean();
                projectUsers = people.map((p: any) => ({
                    ...p,
                    roles: roleMap.get(p?._id?.toString?.()) || [],
                }));
            }
        } catch (err) {
            console.log("Error while fetching project users: ", err);
        }
        projectObj.project_users = projectUsers;

        let docsRaw: any[] = [];
        try {
            docsRaw = await Project_Docs.find({ project_id: projectid, status: { $ne: 0 } })
                .populate({
                    path: "access_to",
                    select: { name: 1, email: 1, avatar_url: 1 },
                })
                .lean();
        } catch (err) {
            console.log("Error while fetching project docs: ", err);
        }

        if (docsRaw.length > 0) {
            projectObj.docs = docsRaw.map((doc: any) => ({
                ...doc,
                access_to: Array.isArray(doc?.access_to)
                    ? doc.access_to.map((u: any) => ({
                        ...(typeof u === "object" && u !== null ? u : {}),
                        roles: roleMap.get(u?._id?.toString?.() ?? u?.toString?.()) || [],
                    }))
                    : [],
            }));
        } else {
            projectObj.docs = [];
        }

        let canEdit = false;
        if (project?.creator == session?.user?.id) {
            canEdit = true;
        } else {
            const { department_id, location_id, area_id } = project;
            const conditions = [
                {
                    check: !!location_id,
                    model: Location_dep_heads,
                    query: { user_id: session?.user?.id, location_dep_id: department_id },
                },
                {
                    check: !!area_id,
                    model: Area_dep_heads,
                    query: { user_id: session?.user?.id, area_dep_id: department_id },
                },
                {
                    check: !location_id && !area_id,
                    model: Region_dep_heads,
                    query: { user_id: session?.user?.id, reg_dep_id: department_id },
                },
            ];

            for (const { check, model, query } of conditions) {
                if (check) {
                    const isDeptHead = await model.findOne(query);
                    if (isDeptHead) {
                        canEdit = true;
                        break;
                    }
                }
            }
        }

        projectObj.canEdit = canEdit;

        return NextResponse.json({ success: true, data: projectObj });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
