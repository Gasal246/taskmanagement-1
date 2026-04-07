import connectDB from "@/lib/mongo";
import mongoose from "mongoose";
import Business_Project from "@/models/business_project.model";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Project_Docs from "@/models/project_docs.model";
import Project_Departments from "@/models/project_departments.model";
import Project_Teams from "@/models/project_team.model";
import Business_staffs from "@/models/business_staffs.model";
import Business_regions from "@/models/business_regions.model";
import Business_areas from "@/models/business_areas.model";
import Users from "@/models/users.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";  

connectDB();

export async function GET(req: NextRequest, context: { params: Promise<{ projectid: string }> }) {
    try{
        const { projectid } = await context.params;
        if (!mongoose.Types.ObjectId.isValid(projectid)) {
            return NextResponse.json({ message: "Invalid project id" }, { status: 400 });
        }
        let project = await Business_Project.findById(projectid);
        if (!project) {
            return NextResponse.json({ message: "Project not found" }, { status: 404 });
        }
        
        const projectObj = project.toObject();
        const rawProjectHeadIds = [
            ...(Array.isArray(projectObj?.project_heads) ? projectObj.project_heads : []),
            projectObj?.project_head
        ]
            .filter(Boolean)
            .map((id: any) => id?.toString?.() ?? String(id))
            .filter((id: string) => mongoose.Types.ObjectId.isValid(id));
        const rawProjectSupervisorIds = (Array.isArray(projectObj?.project_supervisors) ? projectObj.project_supervisors : [])
            .filter(Boolean)
            .map((id: any) => id?.toString?.() ?? String(id))
            .filter((id: string) => mongoose.Types.ObjectId.isValid(id));

        try{
            if (mongoose.Types.ObjectId.isValid(project?.region_id)) {
                const region = await Business_regions.findById(project.region_id).select("region_name").lean();
                projectObj.region = region || null;
            } else {
                projectObj.region = null;
            }
        }catch(err){
            console.log("Error while fetching project region: ", err);
            projectObj.region = null;
        }

        try{
            if (mongoose.Types.ObjectId.isValid(project?.area_id)) {
                const area = await Business_areas.findById(project.area_id).select("area_name region_id").lean();
                projectObj.area = area || null;
            } else {
                projectObj.area = null;
            }
        }catch(err){
            console.log("Error while fetching project area: ", err);
            projectObj.area = null;
        }

        try {
            if (rawProjectHeadIds.length > 0) {
                const heads = await Users.find({ _id: { $in: rawProjectHeadIds }, status: 1 })
                    .select({ name: 1, email: 1, avatar_url: 1 })
                    .lean();
                const headMap = new Map(heads.map((head: any) => [head?._id?.toString?.(), head]));
                projectObj.project_heads = rawProjectHeadIds
                    .map((id: string) => headMap.get(id))
                    .filter(Boolean);
            } else {
                projectObj.project_heads = [];
            }
        } catch (err) {
            console.log("Error while fetching project heads: ", err);
            projectObj.project_heads = [];
        }

        try {
            if (rawProjectSupervisorIds.length > 0) {
                const supervisors = await Users.find({ _id: { $in: rawProjectSupervisorIds }, status: 1 })
                    .select({ name: 1, email: 1, avatar_url: 1 })
                    .lean();
                const supervisorMap = new Map(supervisors.map((user: any) => [user?._id?.toString?.(), user]));
                projectObj.project_supervisors = rawProjectSupervisorIds
                    .map((id: string) => supervisorMap.get(id))
                    .filter(Boolean);
            } else {
                projectObj.project_supervisors = [];
            }
        } catch (err) {
            console.log("Error while fetching project supervisors: ", err);
            projectObj.project_supervisors = [];
        }

        //Fetch Departments
        const departments = await Project_Departments.find({project_id: projectid})
            .select('department_name is_active')
            .catch((err) => {
                console.log("Error while fetching project departments: ", err);
                return [];
            });
        if(departments.length > 0) projectObj.departments = departments;

        //Fetch teams
        const teams = await Project_Teams.find({project_id: projectid})
            .select("team_name")
            .catch((err) => {
                console.log("Error while fetching project teams: ", err);
                return [];
            });
        if(teams.length > 0) projectObj.teams = teams;

        //Fetch Tasks
        const tasks = await Business_Tasks.find({project_id:project._id}, {task_name:1, status:1})
            .catch((err) => {
                console.log("Error while fetching project tasks: ", err);
                return [];
            });
        if(tasks.length > 0) projectObj.tasks = tasks;

        //Fetch Flow
        const flow = await Flow_Log.find({project_id:projectid}).sort({createdAt: -1}).limit(3)
            .catch((err) => {
                console.log("Error while fetching project flows: ", err);
                return [];
            });
        if(flow.length > 0) projectObj.flows = flow;

        let roleMap = new Map<string, string[]>();
        let projectUsers: any[] = [];
        try{
            //Fetch project people (business staffs under this business)
            const staffUserIds: string[] = [];
            if (mongoose.Types.ObjectId.isValid(project?.business_id)) {
                const businessStaffs = await Business_staffs.find({ business_id: project?.business_id, status: { $ne: 0 } }).select("user_id");
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

            // roles lookup
            if (uniqueStaffIds.length > 0) {
                const roles = await User_roles.find({ user_id: { $in: uniqueStaffIds } }).populate({
                    path: "role_id",
                    select: { role_name: 1 }
                }).lean();
                roles.forEach((ur: any) => {
                    const uid = ur?.user_id?.toString?.();
                    const roleName = ur?.role_id?.role_name;
                    if (!uid || !roleName) return;
                    const existing = roleMap.get(uid) || [];
                    roleMap.set(uid, [...existing, roleName]);
                });

                const people = await Users.find({ _id: { $in: uniqueStaffIds }, status: 1 }).select({ name: 1, email: 1, avatar_url: 1 }).lean();
                projectUsers = people.map((p: any) => ({
                    ...p,
                    roles: roleMap.get(p?._id?.toString?.()) || []
                }));
            }
        }catch(err){
            console.log("Error while fetching project users: ", err);
        }
        projectObj.project_users = projectUsers;

        //Fetch Docs
        let docsRaw: any[] = [];
        try{
            docsRaw = await Project_Docs.find({ project_id: projectid, status: { $ne: 0 } }).populate({
                path: "access_to",
                select: { name: 1, email: 1, avatar_url: 1 }
            }).lean();
        }catch(err){
            console.log("Error while fetching project docs: ", err);
        }

        if (docsRaw.length > 0) {
            projectObj.docs = docsRaw.map((doc: any) => ({
                ...doc,
                access_to: Array.isArray(doc?.access_to)
                    ? doc.access_to.map((u: any) => ({
                        ...(typeof u === "object" && u !== null ? u : {}),
                        roles: roleMap.get(u?._id?.toString?.() ?? u?.toString?.()) || []
                    }))
                    : []
            }));
        } else {
            projectObj.docs = [];
        }

        return NextResponse.json({success: true, data:projectObj});
    } catch (error) {
        console.log(error);
        return NextResponse.json({message:"Internal Server Error"}, { status: 500 });
    }
}
