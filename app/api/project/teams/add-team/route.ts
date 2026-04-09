import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Flow_Log from "@/models/Flow_Log.model";
import Project_Teams from "@/models/project_team.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { notifyProjectAssignmentChange } from "@/app/api/helpers/project-assignment-notifications";

connectDB();

interface Body{
    team_name: string,
    project_id: string,
    project_dept_id: string,
    department_id: string,
    team_lead_id: string,
    team_member_ids: string[]
}

export async function POST(req: NextRequest){
    try{

         const session: any = await auth();
        if(!session) return NextResponse.json({message: "Un Authorized Access", status: 401}, { status: 401 });

        const body:Body = await req.json();
        const username = await Users.findById(session?.user?.id).select("name");
        const project = await Business_Project.findById(body?.project_id).select("project_name");

        const project_team = new Project_Teams({
            team_name: body.team_name,
            project_id: body.project_id,
            project_dept_id: body.project_dept_id,
            department_id: body.department_id,
            team_head: body.team_lead_id,
            members_count: body.team_member_ids?.length || 0
        });
        const savedProjectTeam = await project_team.save();

        for(let i=0; i<body.team_member_ids?.length; i++){
            const teamMember = new Project_Team_Members({
                project_team_id: savedProjectTeam._id,
                user_id: body.team_member_ids[i]
            })
            await teamMember.save();
        }

        const flows = new Flow_Log({
            user_id: session?.user?.id,
            Log: `New Team (${body.team_name}) has been created by ${username.name}`,
            project_id: body.project_id,
            description: "New Team Created",
        })

        await flows.save();

        if (body.team_lead_id) {
            await notifyProjectAssignmentChange({
                recipientIds: [body.team_lead_id],
                actorId: session?.user?.id,
                projectId: body.project_id,
                projectName: project?.project_name || "project",
                role: "team-head",
                event: "assigned",
                teamId: String(savedProjectTeam._id),
                teamName: body.team_name,
            });
        }

        const memberRecipientIds = Array.from(
            new Set((body.team_member_ids || []).filter((id) => id && id !== body.team_lead_id))
        );
        if (memberRecipientIds.length > 0) {
            await notifyProjectAssignmentChange({
                recipientIds: memberRecipientIds,
                actorId: session?.user?.id,
                projectId: body.project_id,
                projectName: project?.project_name || "project",
                role: "team-member",
                event: "assigned",
                teamId: String(savedProjectTeam._id),
                teamName: body.team_name,
            });
        }

        return NextResponse.json({ message: "Project Team created successfully", status: 201 }, { status: 201 });

    }catch(err){
        console.log("error at posting new project team", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500}, { status: 500 });
    }
}
