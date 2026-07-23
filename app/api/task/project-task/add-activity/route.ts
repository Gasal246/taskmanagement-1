import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { notifyTaskActivityChange } from "@/app/api/helpers/task-activity-notifications";
import AdminAssignBusiness from "@/models/admin_assign_business.model";
import { resolveSelectedHeadContext } from "@/app/api/helpers/head-reassignment-scope";
import { hasStaffTaskAccess } from "@/app/api/helpers/staff-task-access";

connectDB();

interface Body {
    task_id: string,
    project_id: string | null,
    activity: string,
    description: string,
    assigned_to?: string | null,
    assigned_skill?: string | null,
};

export async function POST(req: NextRequest) {
    try {
        const session: any = await auth();
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const actor = await Users.findById(session?.user?.id).select("name status");

        const body: Body = await req.json();
        if (!body.task_id) return NextResponse.json({ message: "Please provide task_id" }, { status: 400 });

        const task: {
            _id: any,
            assigned_to?: string | null,
            assigned_teams?: string | null,
            is_project_task?: boolean,
            project_id?: string | null,
            business_id?: string | null,
            creator?: string | null,
        } | null = await Business_Tasks.findById(body.task_id)
            .select("assigned_to assigned_teams is_project_task project_id business_id creator")
            .lean<{
                _id: any,
                assigned_to?: string | null,
                assigned_teams?: string | null,
                is_project_task?: boolean,
                project_id?: string | null,
                business_id?: string | null,
                creator?: string | null,
            }>();
        if (!task) {
            return NextResponse.json({ message: "Task not found" }, { status: 404 });
        }

        const actorId = String(session?.user?.id || "");
        const businessId = String(task.business_id || "");
        const [adminAccess, headContext] = await Promise.all([
            AdminAssignBusiness.exists({
                user_id: actorId,
                business_id: businessId,
                status: 1,
            }),
            actor?.status === 1
                ? resolveSelectedHeadContext(req, actorId, businessId)
                : Promise.resolve(null),
        ]);
        const isCreator = String(task.creator || "") === actorId;
        const headHasTaskAccess = headContext
            ? await hasStaffTaskAccess(task, actorId)
            : false;
        if (!adminAccess && !isCreator && !headHasTaskAccess) {
            return NextResponse.json(
                { message: "You are not allowed to add activities to this task" },
                { status: 403 }
            );
        }

        const assignedTo = !task.is_project_task ? task.assigned_to : null;
        const projectId = body.project_id ?? task.project_id ?? null;

        const newActivity = new Task_Activities({
            task_id: body.task_id,
            project_id: projectId,
            activity: body.activity,
            description: body.description,
            is_done: false,
            created_by: session?.user?.id || null,
            assigned_to: assignedTo || null,
            assigned_skill: body.assigned_skill || null
        });
        const savedActivity = await newActivity.save();

        const updatedTask = await Business_Tasks.findByIdAndUpdate(body.task_id, {
            $inc:{activity_count: 1}
        }, {new:true});

        if(updatedTask.status == "Completed") await Business_Tasks.findByIdAndUpdate(body.task_id, {$set:{status:"In Progress"}})

        if (actor?._id) {
            await notifyTaskActivityChange({
                req,
                taskId: body.task_id,
                activityId: savedActivity?._id?.toString(),
                activityTitle: body.activity,
                activityDescription: body.description,
                activityAssignedTo: assignedTo || null,
                action: "added",
                actorId: String(actor._id),
                actorName: actor?.name || "User",
            });
        }
        
        return NextResponse.json({ message: "Activity Added Successfully" }, { status: 201 });

    } catch (err) {
        console.log("error while adding activity", err);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
