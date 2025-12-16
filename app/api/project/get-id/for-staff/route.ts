import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Business_Project from "@/models/business_project.model";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Project_Departments from "@/models/project_departments.model";
import Project_Teams from "@/models/project_team.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
    try {

        const session: any = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ message: "Un-Authorized Access", status: 401 }, { status: 401 });

        const {searchParams} = new URL(req.url);

        const projectid = searchParams.get("project_id");
        let project = await Business_Project.findById(projectid);

        const projectObj = project.toObject();

        //Fetch Departments
        const departments = await Project_Departments.find({ project_id: projectid }).select('department_name is_active');
        if (departments.length > 0) projectObj.departments = departments;

        //Fetch teams
        const teams = await Project_Teams.find({ project_id: projectid }).select("team_name");
        if (teams.length > 0) projectObj.teams = teams;

        //Fetch Tasks
        const tasks = await Business_Tasks.find({ project_id: project._id }, { task_name: 1, status: 1 });
        if (tasks.length > 0) projectObj.tasks = tasks;

        //Fetch Flow
        const flow = await Flow_Log.find({ project_id: projectid }).sort({ createdAt: -1 }).limit(3);
        if (flow.length > 0) projectObj.flows = flow;

        let canEdit = false;

        if (project?.creator == session?.user?.id) {
            canEdit = true;
        } else {
            const { department_id, location_id, area_id } = project

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

            // Find the first matching department head record
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