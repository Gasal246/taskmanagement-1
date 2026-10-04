import { editTeamSchema, areActiveProjectStaff } from "@/app/api/project/helpers/team-validation";
import { inTransaction } from "@/lib/jobs/transaction";
import { notifyProjectAssignmentChange } from "@/app/api/helpers/project-assignment-notifications";
import Business_Project from "@/models/business_project.model";
import connectDB from "@/lib/mongo";
import Flow_Log from "@/models/Flow_Log.model";
import Project_Teams from "@/models/project_team.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";


export async function PUT(req:NextRequest){
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
    const parsed = editTeamSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    try{
        await connectDB();
        const body = parsed.data;
        const existingTeam = await Project_Teams.findById(body._id);
        if (!existingTeam) {
            return NextResponse.json({message:"Team not found", status:404}, {status:404});
        }
        const authorization = await authorizeProjectRequest(existingTeam.project_id.toString(), "manage");
        if (!authorization.ok) return authorization.response;
        const targetIds = Array.from(new Set([body.team_head, ...(body.team_members || [])].filter((id): id is string => Boolean(id))));
        if (!await areActiveProjectStaff(authorization.access.project, targetIds)) {
            return NextResponse.json({message: "All team users must be active staff in this business", status: 400}, {status: 400});
        }
        const actor = await Users.findById(authorization.userId).select("name");

        const result = await inTransaction(async dbSession => {
            const currentTeam = await Project_Teams.findById(body._id).session(dbSession);
            if (!currentTeam) return { message: "Team not found", status: 404 };
            const currentProject = await Business_Project.findById(currentTeam.project_id).session(dbSession);
            if (!currentProject || !await areActiveProjectStaff(currentProject, targetIds, dbSession)) {
                return { message: "Team recipients changed. Refresh and try again.", status: 400 };
            }
            const previousTeamHeadId = currentTeam?.team_head?.toString?.() || "";
            const existingMembers = await Project_Team_Members.find({project_team_id: body?._id}).session(dbSession);
            const existingMembersIds = existingMembers.map((mem:any)=> mem.user_id.toString());
            const toAdd = body.team_members.filter((id:string) => !existingMembersIds.includes(id));
            const toRemove = existingMembersIds.filter((id:string)=> !body.team_members.includes(id));
            if (currentTeam.team_name === body.team_name && previousTeamHeadId === (body.team_head || "")
                && !toAdd.length && !toRemove.length) {
                return { message: "Team Updated", status: 200 };
            }
            await Project_Teams.findByIdAndUpdate(body._id, {
                $set: { team_name: body.team_name, team_head: body.team_head || null, members_count: body.team_members.length }
            }, { session: dbSession });

            if(toAdd.length > 0){
                await Project_Team_Members.insertMany(toAdd.map((id:string)=>({
                    project_team_id: body?._id,
                    user_id: id
                })), { session: dbSession });
            }

            if(toRemove.length > 0){
                await Project_Team_Members.deleteMany({project_team_id:body?._id, user_id: {$in: toRemove}}, { session: dbSession });
            }

            const flow = new Flow_Log({
                user_id: authorization.userId,
                Log: `Team (${body.team_name}) updated by ${actor?.name || "Unknown"}`,
                project_id: currentTeam?.project_id,
                description: "Project team updated",
            });
            await flow.save({ session: dbSession });

            const project = currentProject;
            const projectId = currentTeam?.project_id?.toString?.() || "";
            const nextTeamHeadId = body.team_head ? String(body.team_head) : "";

            if (previousTeamHeadId && previousTeamHeadId !== nextTeamHeadId) {
                await notifyProjectAssignmentChange({
                    dbSession, eventKey: `team:${flow._id}`,
                    recipientIds: [previousTeamHeadId],
                    actorId: authorization.userId,
                    projectId,
                    projectName: project?.project_name || "project",
                    role: "team-head",
                    event: "removed",
                    teamId: body._id,
                    teamName: currentTeam?.team_name || body.team_name,
                });
            }

            if (nextTeamHeadId && previousTeamHeadId !== nextTeamHeadId) {
                await notifyProjectAssignmentChange({
                    dbSession, eventKey: `team:${flow._id}`,
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
                    dbSession, eventKey: `team:${flow._id}`,
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
                    dbSession, eventKey: `team:${flow._id}`,
                    recipientIds: removedMembers,
                    actorId: authorization.userId,
                    projectId,
                    projectName: project?.project_name || "project",
                    role: "team-member",
                    event: "removed",
                    teamId: body._id,
                    teamName: currentTeam?.team_name || body.team_name,
                });
            }

            return { message: "Team Updated", status: 200 };
        });
        return NextResponse.json(result, { status: result.status });

    }catch(err){
        console.error("Project team update failed");
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}
