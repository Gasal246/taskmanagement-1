import { inTransaction } from "@/lib/jobs/transaction";
import { enqueueNotifications } from "@/lib/jobs/enqueue";
import { canAccessBusiness, canAdministerBusiness } from "@/lib/server-access";
import { resolveSelectedHeadContext, getSelectedHeadDirectStaffIds } from "@/app/api/helpers/head-reassignment-scope";
import Staff from "@/models/business_staffs.model";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";
import ProjectTeams from "@/models/project_team.model";
import mongoose from "mongoose";

interface Body{
    project_id: string | null,
    assigned_to: string | string[] | null,
    task_name:string,
    task_description: string,
    status: string,
    business_id: string,
    is_project_task: boolean
}

export async function POST(req:NextRequest){
    try{
        await connectDB();
        const session: any = await auth();
        if(!session) return new NextResponse("Un Authorized Access", { status: 401 });
        
        const user = await Users.findById(session?.user?.id).select("name status");

        if (!user || user.status !== 1) return NextResponse.json({ message: "Active user required" }, { status: 403 });
        const body:Body = await req.json();
        if (typeof body.task_name !== "string" || body.task_name.trim().length < 2 || body.task_name.length > 200 ||
            (body.task_description != null && (typeof body.task_description !== "string" || body.task_description.length > 5000))) {
            return NextResponse.json({ message: "Provide a task title of 2–200 characters and a description up to 5000 characters" }, { status: 400 });
        }
        body.task_name = body.task_name.trim();
        body.status = body.status || "To Do";

        if (body.is_project_task) {
            if (!body.project_id || !mongoose.isValidObjectId(body.project_id)) {
                return NextResponse.json({ message: "Valid project_id is required" }, { status: 400 });
            }
            const authorization = await authorizeProjectRequest(body.project_id, "view");
            if (!authorization.ok) return authorization.response;
            if (!authorization.access.canCreateTasks) {
                return NextResponse.json({ message: "You cannot create tasks for this project" }, { status: 403 });
            }
            const teamIds = Array.from(new Set(
                (Array.isArray(body.assigned_to) ? body.assigned_to : body.assigned_to ? [body.assigned_to] : [])
                    .map(String)
                    .filter(Boolean)
            ));
            if (!teamIds.length || teamIds.some((teamId) => !mongoose.isValidObjectId(teamId))) {
                return NextResponse.json({ message: "Select at least one valid team" }, { status: 400 });
            }
            const teams: any[] = await ProjectTeams.find({ _id: { $in: teamIds }, project_id: body.project_id })
                .select("_id team_head")
                .lean();
            if (teams.length !== teamIds.length) {
                return NextResponse.json({ message: "Every selected team must belong to this project" }, { status: 400 });
            }
            if (
                !authorization.access.canViewAllTeams &&
                teams.some((team) => String(team.team_head || "") !== String(session.user.id))
            ) {
                return NextResponse.json({ message: "Team leads may select only teams they lead" }, { status: 403 });
            }
            body.assigned_to = teamIds;
            body.business_id = String(authorization.access.project.business_id);
        }

        if (!body.is_project_task) {
            if (!mongoose.isValidObjectId(body.business_id)) return NextResponse.json({ message: "Valid business_id is required" }, { status: 400 });
            if (!await canAccessBusiness(session.user.id, body.business_id)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
            if (body.assigned_to && (typeof body.assigned_to !== "string" || !mongoose.Types.ObjectId.isValid(body.assigned_to))) {
                return NextResponse.json({ message: "Select one valid staff member" }, { status: 400 });
            }
            if (body.assigned_to) {
                const target = await Users.exists({ _id: body.assigned_to, status: 1 });
                const member = await Staff.exists({ user_id: body.assigned_to, business_id: body.business_id, status: 1 });
                if (!target || !member) return NextResponse.json({ message: "Assignee must be active staff in this business" }, { status: 400 });
                if (String(body.assigned_to) !== String(session.user.id) && !await canAdministerBusiness(session.user.id, body.business_id)) {
                    const head = await resolveSelectedHeadContext(req, session.user.id, body.business_id);
                    const staffIds = head ? await getSelectedHeadDirectStaffIds(head) : [];
                    if (!staffIds.includes(body.assigned_to)) return NextResponse.json({ message: "Assignee is outside your reporting scope" }, { status: 403 });
                }
            }
        }
        if(!body.assigned_to){
            body.assigned_to = null;
        }

        const Task = await inTransaction(async dbSession => {
            const newTask = new Business_Tasks({
                project_id: body.project_id,
                is_project_task: body.is_project_task,
                creator: session?.user?.id,
                task_name: body.task_name,
                task_description: body.task_description,
                start_date: null,
                end_date: null,
                status: body.is_project_task ? "To Do" : body.status,
                activity_count: 0,
                completed_activity: 0,
                business_id: body.business_id
            });
            {body.is_project_task ? newTask.assigned_teams = body.assigned_to || [] : newTask.assigned_to = body.assigned_to}
            const Task = await newTask.save({ session: dbSession });
            if(body.is_project_task){
                const taskFLow = new Flow_Log({
                    Log: `${body.task_name} Task Added by ${user.name}`,
                    project_id: body?.project_id || "",
                    task_id: Task._id,
                    descrption: "New Task Added",
                    user_id: session?.user?.id
                });
                await taskFLow.save({ session: dbSession });
            }

            if (!body.is_project_task && body.assigned_to) {
                const truncateText = (value: string, maxLength: number) => {
                    const text = value?.trim() || "";
                    if (text.length <= maxLength) return text;
                    return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
                };

                const roleCookie = req.cookies.get("user_role")?.value || "";
                const domainCookie = req.cookies.get("user_domain")?.value || "";
                let roleLabel = "";
                let domainLabel = "";
                try {
                    const parsedRole = roleCookie ? JSON.parse(roleCookie) : null;
                    roleLabel = parsedRole?.role_name || parsedRole?.role || "";
                } catch (error) {
                    roleLabel = "";
                }
                try {
                    const parsedDomain = domainCookie ? JSON.parse(domainCookie) : null;
                    domainLabel =
                        parsedDomain?.region_name ||
                        parsedDomain?.area_name ||
                        parsedDomain?.location_name ||
                        parsedDomain?.dept_name ||
                        parsedDomain?.name ||
                        "";
                } catch (error) {
                    domainLabel = "";
                }

                const formattedRole = roleLabel ? roleLabel.split("_").join(" ") : "";
                const byLineParts = [formattedRole, domainLabel].filter(Boolean);
                const byLine = byLineParts.join(" + ");

                const taskNameShort = truncateText(body.task_name || "Task", 56);
                const taskDescriptionShort = truncateText(body.task_description || "", 120);
                const taskId = Task?._id?.toString();

                const notificationTitle = "New Task Updated";
                const notificationBody = [taskNameShort, taskDescriptionShort]
                    .filter(Boolean)
                    .join(" — ");

                const data = { type: "task", event: "assigned", actionRequired: "true", taskId: taskId || "", link: "" };
                await enqueueNotifications([{
                    recipient_id: body.assigned_to, sender_id: session.user.id, kind: "task",
                    title: notificationTitle, body: notificationBody, data,
                    meta: { taskId, taskName: taskNameShort, taskDescription: taskDescriptionShort,
                        byLine, role: formattedRole || roleLabel, domain: domainLabel }, read_at: null,
                }], { notification: { title: notificationTitle, body: notificationBody || taskNameShort },
                    data: { ...data, taskName: taskNameShort, taskDescription: taskDescriptionShort, byLine },
                }, `task:${Task._id}:created`, dbSession);
            }
            return Task;
        });

        return NextResponse.json({message:"Task Created", data:Task}, {status: 201});
    }catch(err){
        console.error("Task creation failed");
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
        
    }
}
