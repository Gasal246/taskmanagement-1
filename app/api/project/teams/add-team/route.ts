import { createTeamSchema, areActiveProjectStaff } from "@/app/api/project/helpers/team-validation";
import { inTransaction } from "@/lib/jobs/transaction";
import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Flow_Log from "@/models/Flow_Log.model";
import Project_Teams from "@/models/project_team.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { notifyProjectAssignmentChange } from "@/app/api/helpers/project-assignment-notifications";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";
import ProjectDepartments from "@/models/project_departments.model";


export async function POST(req: NextRequest){
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
    const parsed = createTeamSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    try{
        await connectDB();

        const body = parsed.data;
        const authorization = await authorizeProjectRequest(body.project_id, "manage");
        if (!authorization.ok) return authorization.response;
        const linkedDepartment = await ProjectDepartments.exists({
            _id: body.project_dept_id,
            project_id: body.project_id,
        });
        if (!linkedDepartment) {
            return NextResponse.json({message: "Team department is not linked to this project", status: 400}, {status: 400});
        }
        const targetIds = Array.from(new Set([body.team_lead_id, ...(body.team_member_ids || [])].filter(Boolean)));
        if (!await areActiveProjectStaff(authorization.access.project, targetIds)) {
            return NextResponse.json({message: "All team users must be active staff in this business", status: 400}, {status: 400});
        }
        const username = await Users.findById(authorization.userId).select("name");

        const memberIds = Array.from(new Set(body.team_member_ids || []));
        const result = await inTransaction(async dbSession => {
            const currentProject = await Business_Project.findById(body.project_id).session(dbSession);
            if (!currentProject) return { message: "Project not found", status: 404 };
            if (!await areActiveProjectStaff(currentProject, targetIds, dbSession) ||
                !await ProjectDepartments.exists({ _id: body.project_dept_id, project_id: body.project_id }).session(dbSession)) {
                return { message: "Team recipients or department changed. Refresh and try again.", status: 400 };
            }
            const project_team = new Project_Teams({
                team_name: body.team_name,
                project_id: body.project_id,
                project_dept_id: body.project_dept_id,
                department_id: body.department_id,
                team_head: body.team_lead_id,
                members_count: memberIds.length
            });
            const savedProjectTeam = await project_team.save({ session: dbSession });

            if (memberIds.length) await Project_Team_Members.insertMany(memberIds.map(user_id => ({
                project_team_id: savedProjectTeam._id, user_id,
            })), { session: dbSession });

            const flows = new Flow_Log({
                user_id: authorization.userId,
                Log: `New Team (${body.team_name}) has been created by ${username?.name || "Unknown"}`,
                project_id: body.project_id,
                description: "New Team Created",
            })

            await flows.save({ session: dbSession });

            if (body.team_lead_id) {
                await notifyProjectAssignmentChange({
                    dbSession, eventKey: `team:${flows._id}`,
                    recipientIds: [body.team_lead_id],
                    actorId: authorization.userId,
                    projectId: body.project_id,
                    projectName: currentProject.project_name || "project",
                    role: "team-head",
                    event: "assigned",
                    teamId: String(savedProjectTeam._id),
                    teamName: body.team_name,
                });
            }

            const memberRecipientIds = Array.from(
                new Set(memberIds.filter((id) => id && id !== body.team_lead_id))
            );
            if (memberRecipientIds.length > 0) {
                await notifyProjectAssignmentChange({
                    dbSession, eventKey: `team:${flows._id}`,
                    recipientIds: memberRecipientIds,
                    actorId: authorization.userId,
                    projectId: body.project_id,
                    projectName: currentProject.project_name || "project",
                    role: "team-member",
                    event: "assigned",
                    teamId: String(savedProjectTeam._id),
                    teamName: body.team_name,
                });
            }

            return { message: "Project Team created successfully", status: 201 };
        });

        return NextResponse.json(result, { status: result.status });

    }catch(err){
        console.error("Project team creation failed");
        return NextResponse.json({ message: "Internal Server Error", status: 500}, { status: 500 });
    }
}
