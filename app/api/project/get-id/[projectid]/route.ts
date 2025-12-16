import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Project_Docs from "@/models/project_docs.model";
import Project_Departments from "@/models/project_departments.model";
import Project_Teams from "@/models/project_team.model";
import Business_staffs from "@/models/business_staffs.model";
import Users from "@/models/users.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";  

connectDB();

export async function GET(req: NextRequest, {params}: { params: { projectid: string }}) {
    try{
        const {projectid} = params;
        let project = await Business_Project.findById(projectid);
        if (!project) {
            return NextResponse.json({ message: "Project not found" }, { status: 404 });
        }
        
        const projectObj = project.toObject();

        //Fetch Departments
        const departments = await Project_Departments.find({project_id: projectid}).select('department_name is_active');
        if(departments.length > 0) projectObj.departments = departments;

        //Fetch teams
        const teams = await Project_Teams.find({project_id: projectid}).select("team_name");
        if(teams.length > 0) projectObj.teams = teams;

        //Fetch Tasks
        const tasks = await Business_Tasks.find({project_id:project._id}, {task_name:1, status:1});
        if(tasks.length > 0) projectObj.tasks = tasks;

        //Fetch Flow
        const flow = await Flow_Log.find({project_id:projectid}).sort({createdAt: -1}).limit(3);
        if(flow.length > 0) projectObj.flows = flow;

        //Fetch Docs
        const docsRaw = await Project_Docs.find({ project_id: projectid, status: { $ne: 0 } }).populate({
            path: "access_to",
            select: { name: 1, email: 1, avatar_url: 1 }
        }).lean();

        //Fetch project people (business staffs under this business)
        const businessStaffs = await Business_staffs.find({ business_id: project?.business_id, status: { $ne: 0 } }).select("user_id");
        const staffUserIds = businessStaffs.map((bs) => bs.user_id).filter(Boolean).map((id: any) => id.toString());
        if (project?.creator) staffUserIds.push(project.creator.toString());
        if (project?.admin_id) staffUserIds.push(project.admin_id.toString());
        const uniqueStaffIds = [...new Set(staffUserIds)];

        // roles lookup
        let roleMap = new Map<string, string[]>();
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
        }

        if (uniqueStaffIds.length > 0) {
            const people = await Users.find({ _id: { $in: uniqueStaffIds } }).select({ name: 1, email: 1, avatar_url: 1 }).lean();
            projectObj.project_users = people.map((p: any) => ({
                ...p,
                roles: roleMap.get(p?._id?.toString?.()) || []
            }));
        } else {
            projectObj.project_users = [];
        }

        if (docsRaw.length > 0) {
            projectObj.docs = docsRaw.map((doc: any) => ({
                ...doc,
                access_to: (doc?.access_to || []).map((u: any) => ({
                    ...u,
                    roles: roleMap.get(u?._id?.toString?.()) || []
                }))
            }));
        }

        return NextResponse.json({success: true, data:projectObj});
    } catch (error) {
        console.log(error);
        return NextResponse.json({message:"Internal Server Error"}, { status: 500 });
    }
}
