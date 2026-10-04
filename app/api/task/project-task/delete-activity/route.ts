import { inTransaction } from "@/lib/jobs/transaction";
import { enqueueFileCleanup } from "@/lib/jobs/enqueue";
import { canEditActivitySchedule } from "@/app/api/helpers/activity-schedule-access";
import { recalculateTaskTimeline } from "@/app/api/helpers/task-timeline";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { notifyTaskActivityChange } from "@/app/api/helpers/task-activity-notifications";
import ActivityComments from "@/models/activity_comments.model";
import ActivityCommentReads from "@/models/activity_comment_reads.model";
import { canManageProjectTaskActivities } from "@/app/api/helpers/project-task-teams";

export async function DELETE(req:NextRequest){
    try{
        await connectDB();
        const session: any = await auth();
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const actor = await Users.findById(session?.user?.id).select("name status");

        const {searchParams} = new URL(req.url);
        const activity_id = searchParams.get("activity_id");
        if(!activity_id) return NextResponse.json({message: "Please Provide activity_id"}, {status:400});

        const activityToDelete = await Task_Activities.findById(activity_id);
        if (!activityToDelete) {
            return NextResponse.json({message: "Activity not found"}, {status:404});
        }
        const owningTask: any = await Business_Tasks.findById(activityToDelete.task_id)
            .select("business_id project_id creator assigned_to is_project_task assigned_teams")
            .lean();
        if (
            owningTask?.is_project_task &&
            !(await canManageProjectTaskActivities(owningTask, String(session.user.id)))
        ) {
            return NextResponse.json({ message: "You cannot delete this activity" }, { status: 403 });
        }

        if (!owningTask) return NextResponse.json({ message: "Task not found" }, { status: 404 });
        if (!owningTask.is_project_task && !session.user.is_super &&
            !await canEditActivitySchedule(req, owningTask, actor)) {
            return NextResponse.json({ message: "You cannot delete this activity" }, { status: 403 });
        }
        await inTransaction(async dbSession => {
            // Re-read on every transaction retry: counters and captured file paths must
            // describe the activity that is actually being deleted.
            const activity: any = await Task_Activities.findById(activity_id).session(dbSession);
            if (!activity) return true;
            const comments = await ActivityComments.find({ activity_id }).select("_id attachment.storage_path").session(dbSession).lean();
            const commentIds = comments.map((comment: any) => comment._id);
            await Task_Activities.findByIdAndDelete(activity_id, { session: dbSession });
            await ActivityComments.deleteMany({ activity_id }, { session: dbSession });
            await ActivityCommentReads.deleteMany({ comment_id: { $in: commentIds } }, { session: dbSession });
            const afterDel: any = await Business_Tasks.findByIdAndUpdate(activity.task_id, {
                $inc: { activity_count: -1, completed_activity: activity.is_done ? -1 : 0 },
            }, { new: true, session: dbSession });
            if (!afterDel) throw new Error("Task was deleted while removing activity");
            if (afterDel.activity_count === afterDel.completed_activity) {
                await Business_Tasks.findByIdAndUpdate(afterDel._id, { $set: { status: "Completed" } }, { session: dbSession });
            }
            await recalculateTaskTimeline(activity.task_id, dbSession);
            await enqueueFileCleanup([
                ...comments.map((comment: any) => comment.attachment?.storage_path),
                ...(activity.documents || []).map((document: any) => document.storagePath),
            ], dbSession);
            if (actor?._id) await notifyTaskActivityChange({ req, dbSession,
                eventKey: `activity:${activity._id}:removed`, taskId: String(activity.task_id),
                activityId: String(activity._id), activityTitle: activity.activity || "",
                activityDescription: activity.description || "", activityAssignedTo: activity.assigned_to?.toString() || null,
                action: "removed", actorId: String(actor._id), actorName: actor.name || "User",
            });
            return true;
        });

        return NextResponse.json({message: "Activity Deleted Successfully"}, {status: 203})
    }catch(err){
        console.log("error while deleting activity", err);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}
