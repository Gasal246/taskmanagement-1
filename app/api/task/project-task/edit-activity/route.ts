import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Task_Activities from "@/models/task_activities.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { notifyTaskActivityChange } from "@/app/api/helpers/task-activity-notifications";
import { getHeadStaffIds, getRoleNameFromRequest } from "@/app/api/helpers/task-filter-scope";

connectDB();

interface Body {
    activity_id: string,
    is_done?: boolean,
    activity?: string | null,
    description?: string | null,
    assigned_to?: string | null,
    forwarded_to?: string | null,
    assigned_skill?: string | null,
    is_status?: boolean
}

export async function PUT(req: NextRequest) {
    try {

        const session: any = await auth();
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });
        const actor = await Users.findById(session?.user?.id).select("name status");

        const body: Body = await req.json();
        if (!body.activity_id) return NextResponse.json({ message: "Please Provide Activity_id" }, { status: 400 });

        if (Object.prototype.hasOwnProperty.call(body, "forwarded_to")) {
            if (!body.forwarded_to) {
                return NextResponse.json({ message: "Please select a staff member", status: 400 }, { status: 400 });
            }

            const currentActivity = await Task_Activities.findById(body.activity_id);
            if (!currentActivity) {
                return NextResponse.json({ message: "Activity not found", status: 404 }, { status: 404 });
            }

            const actorId = String(session?.user?.id || "");
            if (actor?.status !== 1) {
                return NextResponse.json({ message: "An active HEAD role is required", status: 403 }, { status: 403 });
            }
            if (String(currentActivity.assigned_to || "") !== actorId) {
                return NextResponse.json(
                    { message: "Only the HEAD assigned to this activity can reassign it", status: 403 },
                    { status: 403 }
                );
            }

            const roleName = getRoleNameFromRequest(req);
            const [subordinateIds, activeTarget] = await Promise.all([
                getHeadStaffIds(actorId, roleName),
                Users.exists({ _id: body.forwarded_to, status: 1 }),
            ]);
            if (!activeTarget || !subordinateIds.includes(String(body.forwarded_to))) {
                return NextResponse.json(
                    { message: "The selected staff member is not in your reporting scope", status: 403 },
                    { status: 403 }
                );
            }

            await Task_Activities.findByIdAndUpdate(body.activity_id, {
                $set: { forwarded_to: body.forwarded_to }
            });

            return NextResponse.json({ message: "Activity reassigned successfully", status: 200 }, { status: 200 });
        }

        if (body.is_status) {
            const currentActivity = await Task_Activities.findById(body.activity_id);
            if (!currentActivity) {
                return NextResponse.json({ message: "Activity not found", status: 404 }, { status: 404 });
            }

            const changeStatus = await Task_Activities.findByIdAndUpdate(body.activity_id, {
                $set: { is_done: body.is_done }
            }, { new: true });

            if (body.is_done && !currentActivity.is_done) {
                const completedTime = new Date().getTime() -  changeStatus.createdAt.getTime();
                await Task_Activities.findByIdAndUpdate(changeStatus._id, {
                    $set: {completed_in: completedTime}
                })
                const updatedActivity = await Business_Tasks.findByIdAndUpdate(changeStatus.task_id, {
                    $inc: { completed_activity: 1 },
                },{new:true})

                if(updatedActivity.activity_count == updatedActivity.completed_activity){
                    await Business_Tasks.findByIdAndUpdate(updatedActivity._id, {
                        $set: {status: "Completed"}
                    })
                    if(updatedActivity.is_project_task){
                        const newFLow = new Flow_Log({
                            user_id: session?.user?.id,
                            Log: `${updatedActivity.task_name} Task has been marked as Completed`,
                            task_id: updatedActivity._id,
                            project_id: updatedActivity.project_id || "",
                            description: "Task Marked as complete"
                        })
                        await newFLow.save();
                    }
                }

                const taskId = changeStatus?.task_id?.toString();
                if (actor?._id && taskId) {
                    await notifyTaskActivityChange({
                        req,
                        taskId,
                        activityId: changeStatus?._id?.toString(),
                        activityTitle: changeStatus?.activity || "",
                        activityDescription: changeStatus?.description || "",
                        activityAssignedTo: changeStatus?.assigned_to?.toString() || null,
                        action: "completed",
                        actorId: String(actor._id),
                        actorName: actor?.name || "User",
                    });
                }
            }

            if (!body.is_done && currentActivity.is_done) {
                await Task_Activities.findByIdAndUpdate(changeStatus._id, {
                    $set: {completed_in: null}
                })
                const updatedActivity = await Business_Tasks.findByIdAndUpdate(changeStatus.task_id, {
                    $inc: { completed_activity: -1 },
                },{new:true})
                if (updatedActivity.completed_activity < updatedActivity.activity_count) {
                    await Business_Tasks.findByIdAndUpdate(updatedActivity._id, {
                        $set: {status: "In Progress"}
                    })
                }
            }

            return NextResponse.json({
                message: body.is_done ? "Activity marked as completed" : "Activity marked as not completed",
                status: 200
            }, { status: 200 });
        } else {
            const updateFields: Record<string, any> = {};
            if (Object.prototype.hasOwnProperty.call(body, "activity")) updateFields.activity = body.activity;
            if (Object.prototype.hasOwnProperty.call(body, "description")) updateFields.description = body.description;
            if (Object.prototype.hasOwnProperty.call(body, "assigned_to")) updateFields.assigned_to = body.assigned_to;
            if (Object.prototype.hasOwnProperty.call(body, "assigned_skill")) updateFields.assigned_skill = body.assigned_skill;

            if (!Object.keys(updateFields).length) {
                return NextResponse.json({ message: "No updates provided", status: 400 }, { status: 400 });
            }

            await Task_Activities.findByIdAndUpdate(body.activity_id, {
                $set: updateFields
            });

            return NextResponse.json({ message: "Activity Updated", status: 200 }, { status: 200 });
        }
    } catch (err) {
        console.log("error while updating task activity", err);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });

    }
}
