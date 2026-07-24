import { notifyProjectAssignmentChange } from "@/app/api/helpers/project-assignment-notifications";
import Business_Project from "@/models/business_project.model";
import connectDB from "@/lib/mongo";
import Flow_Log from "@/models/Flow_Log.model";
import Project_Teams from "@/models/project_team.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";
import { isActiveStaffInProjectBusiness } from "@/app/api/helpers/project-access";

connectDB();

interface Body{
    _id: string,
    team_name: string,
    team_head: string,
    team_members: string[]
};

export async function PUT(req:NextRequest){
    try{
        const body:Body = await req.json()
        const existingTeam = await Project_Teams.findById(body._id);
        if (!existingTeam) {
            return NextResponse.json({message:"Team not found", status:404}, {status:404});
        }
        const authorization = await authorizeProjectRequest(existingTeam.project_id.toString(), "manage");
        if (!authorization.ok) return authorization.response;
        const targetIds = Array.from(new Set([body.team_head, ...(body.team_members || [])].filter(Boolean)));
        const targetChecks = await Promise.all(
            targetIds.map((targetId) => isActiveStaffInProjectBusiness(authorization.access.project, targetId))
        );
        if (targetChecks.some((eligible) => !eligible)) {
            return NextResponse.json({message: "All team users must be active staff in this business", status: 400}, {status: 400});
        }
        const actor = await Users.findById(authorization.userId).select("name");

        const previousTeamHeadId = existingTeam?.team_head?.toString?.() || "";
        await Project_Teams.findByIdAndUpdate(body._id, {
            $set:{team_name: body.team_name, team_head: body.team_head}
        });

        const existingMembers = await Project_Team_Members.find({project_team_id: body?._id});
        const existingMembersIds = existingMembers.map((mem:any)=> mem.user_id.toString());
        const toAdd = body.team_members.filter((id:string) => !existingMembersIds.includes(id));
        const toRemove = existingMembersIds.filter((id:string)=> !body.team_members.includes(id));

        if(toAdd.length > 0){
            await Project_Team_Members.insertMany(toAdd.map((id:string)=>({
                project_team_id: body?._id,
                user_id: id
            })));
        }

        if(toRemove.length > 0){
            await Project_Team_Members.deleteMany({project_team_id:body?._id, user_id: {$in: toRemove}});
        }

        await Project_Teams.findByIdAndUpdate(body._id, {
            $set: { members_count: body.team_members?.length || 0 }
        });

        await new Flow_Log({
            user_id: authorization.userId,
            Log: `Team (${body.team_name}) updated by ${actor?.name || "Unknown"}`,
            project_id: existingTeam?.project_id,
            description: "Project team updated",
        }).save();

        const project = await Business_Project.findById(existingTeam?.project_id).select("project_name");
        const projectId = existingTeam?.project_id?.toString?.() || "";
        const nextTeamHeadId = body.team_head ? String(body.team_head) : "";

        if (previousTeamHeadId && previousTeamHeadId !== nextTeamHeadId) {
            await notifyProjectAssignmentChange({
                recipientIds: [previousTeamHeadId],
                actorId: authorization.userId,
                projectId,
                projectName: project?.project_name || "project",
                role: "team-head",
                event: "removed",
                teamId: body._id,
                teamName: existingTeam?.team_name || body.team_name,
            });
        }

        if (nextTeamHeadId && previousTeamHeadId !== nextTeamHeadId) {
            await notifyProjectAssignmentChange({
                recipientIds: [nextTeamHeadId],
                actorId: authorization.userId,
                projectId,
                projectName: project?.project_name || "project",
                role: "team-head",
                event: "assigned",
                teamId: body._id,
                teamName: body.team_name,
            });
        }

        const addedMembers = Array.from(new Set(toAdd.filter((id:string) => id && id !== nextTeamHeadId)));
        if (addedMembers.length > 0) {
            await notifyProjectAssignmentChange({
                recipientIds: addedMembers,
                actorId: authorization.userId,
                projectId,
                projectName: project?.project_name || "project",
                role: "team-member",
                event: "assigned",
                teamId: body._id,
                teamName: body.team_name,
            });
        }

        const removedMembers = Array.from(new Set(toRemove.filter((id:string) => id && id !== previousTeamHeadId)));
        if (removedMembers.length > 0) {
            await notifyProjectAssignmentChange({
                recipientIds: removedMembers,
                actorId: authorization.userId,
                projectId,
                projectName: project?.project_name || "project",
                role: "team-member",
                event: "removed",
                teamId: body._id,
                teamName: existingTeam?.team_name || body.team_name,
            });
        }

        return NextResponse.json({message:"Team Updated", status:200}, {status:200});

    }catch(err){
        console.log("error while editing team: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}
