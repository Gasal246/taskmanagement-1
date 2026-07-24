import connectDB from "@/lib/mongo";
import Project_Teams from "@/models/project_team.model";
import '@/models/project_departments.model';
import '@/models/users.model';
import { NextRequest, NextResponse } from "next/server";
import Project_Team_Members from "@/models/project_team_members.model";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const project_id = searchParams.get("project_id");
        if (!project_id) {
            return NextResponse.json({message: "Project id is required", status: 400}, { status: 400 });
        }
        const authorization = await authorizeProjectRequest(project_id, "view");
        if (!authorization.ok) return authorization.response;

        let teamQuery: any = { project_id: project_id };
        if (!authorization.access.canManage) {
            const memberships = await Project_Team_Members.find({ user_id: authorization.userId })
                .select("project_team_id")
                .lean();
            const memberTeamIds = memberships
                .map((row: any) => row?.project_team_id)
                .filter(Boolean);

            teamQuery = {
                project_id: project_id,
                $or: [
                    { team_head: authorization.userId },
                    { _id: { $in: memberTeamIds } },
                ],
            };
        }

        const teams = await Project_Teams.find(teamQuery)
            .populate('team_head', 'name email avatar_url')
            .populate("project_dept_id", "department_name")
            .lean();
        
        for (const team of teams){
            const member = await Project_Team_Members.find({ project_team_id: team._id })
                .populate("user_id", "name email avatar_url")
                .lean();
            team.members = member;
        }
        
        return NextResponse.json({ data: teams, status: 200}, {status: 200})
    }catch(err){
        console.log("error while getting teams get-by-project", err);
        return NextResponse.json({message: "Internal Server Error"}, {status: 500})
        
    }
}
