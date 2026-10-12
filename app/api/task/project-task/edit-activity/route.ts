import { inTransaction } from "@/lib/jobs/transaction";
import { assertUploadNotRetired, enqueueFileCleanup } from "@/lib/jobs/enqueue";
import { randomUUID } from "node:crypto";
import { activityScheduleSchema } from "@/lib/activity-schedule";
import { canEditActivitySchedule } from "@/app/api/helpers/activity-schedule-access";
import { updateActivitySchedule } from "@/app/api/helpers/activity-schedule-update";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Task_Activities from "@/models/task_activities.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { notifyTaskActivityAssignmentChange, notifyTaskActivityChange } from "@/app/api/helpers/task-activity-notifications";
import {
    getHierarchyReassignmentHeads,
    getSelectedHeadDirectStaffIds,
    resolveSelectedHeadContext,
} from "@/app/api/helpers/head-reassignment-scope";
import {
    canAssignProjectTaskActivities,
    canManageProjectTaskActivities,
    getProjectTaskAssignmentCandidateIds,
} from "@/app/api/helpers/project-task-teams";

import AdminAssignBusiness from "@/models/admin_assign_business.model";
import BusinessStaffs from "@/models/business_staffs.model";
import { canChangeActivityStatus, getActivityAssigneeIds } from "@/app/api/helpers/activity-status-access";
import { ActivityDocumentValidationError, validateActivityDocuments } from "@/app/api/helpers/activity-documents";
import type { ActivityDocument } from "@/lib/activityDocuments";
interface Body {
    activity_id: string,
    start_date?: string,
    end_date?: string,
    expected_start_date?: string | null,
    expected_end_date?: string | null,
    is_done?: boolean,
    activity?: string | null,
    description?: string | null,
    assigned_to?: string | null,
    forwarded_to?: string | null,
    assignee_id?: string | null,
    assignment_action?: "add" | "remove",
    assigned_skill?: string | null,
    is_status?: boolean,
    documents?: ActivityDocument[]
}

export async function PUT(req: NextRequest) {
    try {
        await connectDB();

        const session: any = await auth();
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });
        const actor = await Users.findById(session?.user?.id).select("name status");

        const body: Body = await req.json();
        if (!body.activity_id) return NextResponse.json({ message: "Please Provide Activity_id" }, { status: 400 });

        if (body.assignment_action || Object.prototype.hasOwnProperty.call(body, "forwarded_to")) {
            const currentActivity = await Task_Activities.findById(body.activity_id);
            if (!currentActivity) {
                return NextResponse.json({ message: "Activity not found", status: 404 }, { status: 404 });
            }

            const actorId = String(session?.user?.id || "");
            const task: any = await Business_Tasks.findById(currentActivity.task_id)
                .select("business_id project_id creator assigned_to is_project_task assigned_teams")
                .lean();
            if (!task) return NextResponse.json({ message: "Task not found", status: 404 }, { status: 404 });
            if (actor?.status !== 1) {
                return NextResponse.json({ message: "An active account is required", status: 403 }, { status: 403 });
            }
            const adminAccess = await AdminAssignBusiness.exists({
                user_id: actorId,
                business_id: task.business_id,
                status: 1,
            });
            const headContext = !task.is_project_task && !adminAccess
                ? await resolveSelectedHeadContext(
                    req,
                    actorId,
                    String(task.business_id)
                )
                : null;
            const canAssignProject = task.is_project_task
                ? await canAssignProjectTaskActivities(task, actorId)
                : false;
            const canReassign = Boolean(adminAccess) || Boolean(
                task.is_project_task
                    ? canAssignProject && canChangeActivityStatus(task, currentActivity, actorId)
                    : headContext && canChangeActivityStatus(task, currentActivity, actorId)
            );
            if (!canReassign) {
                return NextResponse.json(
                    { message: "You do not have permission to manage this activity's assignments", status: 403 },
                    { status: 403 }
                );
            }

            const action = body.assignment_action || (body.forwarded_to ? "add" : "remove");
            const legacyForwardedId = String(currentActivity.forwarded_to || "");
            const targetId = String(body.assignee_id || body.forwarded_to || (action === "remove" ? legacyForwardedId : ""));
            if (!targetId) {
                return NextResponse.json({ message: "Please select an activity member", status: 400 }, { status: 400 });
            }

            const currentAssigneeIds = getActivityAssigneeIds(currentActivity);
            if (action === "add" && currentAssigneeIds.includes(targetId)) {
                return NextResponse.json({ message: "This person is already assigned to the activity", status: 200 }, { status: 200 });
            }
            if (action === "remove" && !currentAssigneeIds.includes(targetId)) {
                return NextResponse.json({ message: "This person is not assigned to the activity", status: 200 }, { status: 200 });
            }

            const targetUser: any = await Users.findById(targetId).select("name status");
            if (action === "add") {
                if (!targetUser || targetUser.status !== 1) {
                    return NextResponse.json({ message: "Only active staff can be assigned", status: 403 }, { status: 403 });
                }
                if (task.is_project_task) {
                    const candidates = await getProjectTaskAssignmentCandidateIds(task, actorId);
                    if (!candidates.includes(targetId)) {
                        return NextResponse.json(
                            { message: "Activities can only be assigned to active heads or members of the selected teams", status: 403 },
                            { status: 403 }
                        );
                    }
                } else if (adminAccess) {
                    const activeStaff = await BusinessStaffs.exists({
                        user_id: targetId,
                        business_id: task.business_id,
                        status: 1,
                    });
                    if (!activeStaff) {
                        return NextResponse.json({ message: "The selected person is not active staff in this business", status: 403 }, { status: 403 });
                    }
                } else if (headContext) {
                    const [subordinateIds, hierarchyHeads] = await Promise.all([
                        getSelectedHeadDirectStaffIds(headContext),
                        getHierarchyReassignmentHeads(headContext),
                    ]);
                    const hierarchyHeadIds = new Set(hierarchyHeads.map((head) => head._id));
                    if (!subordinateIds.includes(targetId) && !hierarchyHeadIds.has(targetId)) {
                        return NextResponse.json(
                            { message: "The selected staff member is not in your reporting scope", status: 403 },
                            { status: 403 }
                        );
                    }
                }
            }

            const nextAssigneeIds = action === "add"
                ? [...currentAssigneeIds, targetId]
                : currentAssigneeIds.filter((id) => id !== targetId);
            const updateFields: Record<string, any> = {};
            if (action === "remove" && String(currentActivity.assigned_to || "") === targetId) updateFields.assigned_to = null;
            if (action === "remove" && legacyForwardedId === targetId) updateFields.forwarded_to = null;
            if (Object.prototype.hasOwnProperty.call(body, "assigned_skill")) updateFields.assigned_skill = body.assigned_skill;
            const assignmentUpdate: Record<string, any> = {
                $push: {
                    reassignment_history: {
                        action: action === "add" ? "assigned" : "removed",
                        actor_id: actor._id,
                        recipient_id: targetId,
                        previous_recipient_id: null,
                        createdAt: new Date(),
                    }
                }
            };
            if (Object.keys(updateFields).length) assignmentUpdate.$set = updateFields;
            if (action === "add") assignmentUpdate.$addToSet = { assignees: { $each: nextAssigneeIds } };
            else assignmentUpdate.$pull = { assignees: targetId };
            await inTransaction(async dbSession => {
                await Task_Activities.findByIdAndUpdate(body.activity_id, assignmentUpdate, { session: dbSession });
                await notifyTaskActivityAssignmentChange({
                    taskId: String(currentActivity.task_id),
                    activityId: String(currentActivity._id),
                    activityTitle: currentActivity.activity,
                    action: action === "add" ? "assigned" : "removed",
                    targetName: targetUser?.name,
                    participantIds: action === "add" ? nextAssigneeIds : [...nextAssigneeIds, targetId],
                    actorId,
                    eventKey: `activity:${currentActivity._id}:assignment:${action}:${targetId}:${randomUUID()}`,
                    dbSession,
                });
                return true;
            });

            return NextResponse.json({
                message: action === "add" ? "Person added to activity" : "Person removed from activity",
                status: 200,
            }, { status: 200 });
        }

        if (body.is_status) {
            const currentActivity = await Task_Activities.findById(body.activity_id);
            if (!currentActivity) {
                return NextResponse.json({ message: "Activity not found", status: 404 }, { status: 404 });
            }
            const task: any = await Business_Tasks.findById(currentActivity.task_id)
                .select("business_id project_id creator assigned_to is_project_task assigned_teams")
                .lean();
            if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });
            const actorId = String(session?.user?.id || "");
            const [adminAccess, staffAccess] = await Promise.all([
                AdminAssignBusiness.exists({ user_id: actorId, business_id: task.business_id, status: 1 }),
                BusinessStaffs.exists({ user_id: actorId, business_id: task.business_id, status: 1 }),
            ]);
            if (actor?.status !== 1 || !(adminAccess || (staffAccess && canChangeActivityStatus(task, currentActivity, actorId)))) {
                return NextResponse.json({ message: "You cannot change this activity status", status: 403 }, { status: 403 });
            }

            if (typeof body.is_done !== "boolean") return NextResponse.json({ message: "is_done must be a boolean" }, { status: 400 });
            const eventKey = `activity:${body.activity_id}:completed:${randomUUID()}`;
            await inTransaction(async dbSession => {
                const current: any = await Task_Activities.findById(body.activity_id).session(dbSession);
                if (!current) throw new Error("Activity was deleted while changing status");
                if (!(adminAccess || (staffAccess && canChangeActivityStatus(task, current, actorId)))) {
                    throw new Error("Activity assignment changed. Refresh before updating status.");
                }
                if (Boolean(current.is_done) === body.is_done) return true;
                const changeStatus: any = await Task_Activities.findByIdAndUpdate(current._id, { $set: {
                    is_done: body.is_done,
                    completed_in: body.is_done ? Date.now() - current.createdAt.getTime() : null,
                } }, { new: true, session: dbSession });
                const updatedTask: any = await Business_Tasks.findByIdAndUpdate(current.task_id, {
                    $inc: { completed_activity: body.is_done ? 1 : -1 },
                }, { new: true, session: dbSession });
                if (!updatedTask) throw new Error("Task was deleted while changing activity status");
                const completed = updatedTask.activity_count === updatedTask.completed_activity;
                await Business_Tasks.findByIdAndUpdate(updatedTask._id, {
                    $set: { status: completed ? "Completed" : "In Progress" },
                }, { session: dbSession });
                if (completed && body.is_done && updatedTask.is_project_task) {
                    await new Flow_Log({ user_id: session.user.id,
                        Log: `${updatedTask.task_name} Task has been marked as Completed`,
                        task_id: updatedTask._id, project_id: updatedTask.project_id || "",
                        description: "Task Marked as complete",
                    }).save({ session: dbSession });
                }
                if (body.is_done && actor?._id) await notifyTaskActivityChange({ req, dbSession, eventKey,
                    taskId: String(current.task_id), activityId: String(current._id),
                    activityTitle: changeStatus.activity || "", activityDescription: changeStatus.description || "",
                    activityAssignedTo: changeStatus.assigned_to?.toString() || null, action: "completed",
                    actorId: String(actor._id), actorName: actor.name || "User",
                });
                return true;
            });

            return NextResponse.json({
                message: body.is_done ? "Activity marked as completed" : "Activity marked as not completed",
                status: 200
            }, { status: 200 });
        } else {
            const updateFields: Record<string, any> = {};
            const hasScheduleUpdates = Object.prototype.hasOwnProperty.call(body, "start_date") ||
                Object.prototype.hasOwnProperty.call(body, "end_date");
            if (hasScheduleUpdates) {
                const schedule = activityScheduleSchema.safeParse(body);
                if (!schedule.success) {
                    return NextResponse.json({ message: schedule.error.issues[0].message, errors: schedule.error.flatten() }, { status: 400 });
                }

            }
            if (Object.prototype.hasOwnProperty.call(body, "activity")) updateFields.activity = body.activity;
            if (Object.prototype.hasOwnProperty.call(body, "description")) updateFields.description = body.description;
            if (Object.prototype.hasOwnProperty.call(body, "assigned_to")) updateFields.assigned_to = body.assigned_to;
            if (Object.prototype.hasOwnProperty.call(body, "assigned_skill")) updateFields.assigned_skill = body.assigned_skill;

            if (!Object.keys(updateFields).length && !hasScheduleUpdates && !Object.prototype.hasOwnProperty.call(body, "documents")) {
                return NextResponse.json({ message: "No updates provided", status: 400 }, { status: 400 });
            }

            const currentActivity: any = await Task_Activities.findById(body.activity_id)
                .select("task_id start_date end_date is_done documents")
                .lean();
            if (!currentActivity) {
                return NextResponse.json({ message: "Activity not found", status: 404 }, { status: 404 });
            }
            const task: any = await Business_Tasks.findById(currentActivity.task_id)
                .select("business_id project_id creator assigned_to is_project_task assigned_teams")
                .lean();
            if (task?.is_project_task) {
                const actorId = String(session?.user?.id || "");
                const hasContentUpdates =
                    Object.prototype.hasOwnProperty.call(body, "activity") ||
                    Object.prototype.hasOwnProperty.call(body, "description") ||
                    Object.prototype.hasOwnProperty.call(body, "documents");
                const hasAssignmentUpdates =
                    Object.prototype.hasOwnProperty.call(body, "assigned_to") ||
                    Object.prototype.hasOwnProperty.call(body, "assigned_skill");
                if (hasContentUpdates && !(await canManageProjectTaskActivities(task, actorId))) {
                    return NextResponse.json(
                        { message: "Only the task creator or a project manager can edit this activity", status: 403 },
                        { status: 403 }
                    );
                }
                if (hasAssignmentUpdates && !(await canAssignProjectTaskActivities(task, actorId))) {
                    return NextResponse.json(
                        { message: "You cannot assign this activity", status: 403 },
                        { status: 403 }
                    );
                }
                if (Object.prototype.hasOwnProperty.call(body, "assigned_to") && body.assigned_to) {
                    const candidates = await getProjectTaskAssignmentCandidateIds(task, actorId);
                    if (!candidates.includes(String(body.assigned_to))) {
                        return NextResponse.json(
                            { message: "Activities can only be assigned to active heads or members of the selected teams", status: 403 },
                            { status: 403 }
                        );
                    }
                }
            }

            if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });
            if (Object.prototype.hasOwnProperty.call(body, "documents")) {
                if (!task.is_project_task && !(await canEditActivitySchedule(req, task, actor))) {
                    return NextResponse.json({ message: "You cannot edit this activity's files" }, { status: 403 });
                }
                updateFields.documents = await validateActivityDocuments(body.documents, { taskId: String(currentActivity.task_id) });
            }
            if (hasScheduleUpdates && !(await canEditActivitySchedule(req, task, actor))) {
                return NextResponse.json({ message: "You cannot edit this activity schedule" }, { status: 403 });
            }
            if (updateFields.documents) {
                const result = await inTransaction(async dbSession => {
                    const fresh: any = await Task_Activities.findById(body.activity_id).session(dbSession).lean();
                    if (!fresh) return { status: 404, message: "Activity not found" };
                    // An old editor must not overwrite a newer attachment list.
                    if (JSON.stringify(fresh.documents || []) !== JSON.stringify(currentActivity.documents || [])) {
                        return { status: 409, message: "Activity files changed. Refresh before saving." };
                    }
                    const existing = new Set((fresh.documents || []).map((document: any) => document.storagePath));
                    for (const document of updateFields.documents) {
                        if (!existing.has(document.storagePath)) await assertUploadNotRetired(document.storagePath, dbSession);
                    }
                    let result = { status: 200, message: "Activity Updated" };
                    if (hasScheduleUpdates) result = await updateActivitySchedule({ current: fresh, body, actor, contentUpdates: updateFields, dbSession });
                    else await Task_Activities.findByIdAndUpdate(body.activity_id, { $set: updateFields }, { session: dbSession });
                    if (result.status === 200) {
                        const retained = new Set(updateFields.documents.map((document: any) => document.storagePath));
                        await enqueueFileCleanup((fresh.documents || []).filter((document: any) => !retained.has(document.storagePath))
                            .map((document: any) => document.storagePath), dbSession);
                    }
                    return result;
                });
                return NextResponse.json(result, { status: result.status });
            }
            if (hasScheduleUpdates) {
                const result = await updateActivitySchedule({ current: currentActivity, body, actor, contentUpdates: updateFields });
                return NextResponse.json(result, { status: result.status });
            }
            await Task_Activities.findByIdAndUpdate(body.activity_id, { $set: updateFields });

            return NextResponse.json({ message: "Activity Updated", status: 200 }, { status: 200 });
        }
    } catch (err) {
        if (err instanceof ActivityDocumentValidationError) {
            return NextResponse.json({ message: err.message, status: err.status }, { status: err.status });
        }
        console.log("error while updating task activity", err);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });

    }
}
