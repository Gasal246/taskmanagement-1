import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
import { NextRequest, NextResponse } from "next/server";
import Users from "@/models/users.model";
import Business_Project from "@/models/business_project.model";
import Project_Teams from "@/models/project_team.model";
import "@/models/business_skills.model";
import AdminAssignBusiness from "@/models/admin_assign_business.model";
import { addUnreadCommentCounts } from "@/app/api/helpers/activity-comments";
import { resolveSessionUserId } from "@/lib/utils";
import { hasStaffTaskAccess } from "@/app/api/helpers/staff-task-access";
import { normalizeProjectTaskTeamIds, resolveProjectTaskStaffAccess } from "@/app/api/helpers/project-task-teams";
connectDB();

export async function GET(req:NextRequest, context: {params: Promise<{taskid:string}>}){
    try{
        const { taskid } = await context.params;
        const { searchParams } = new URL(req.url);
        const activityScope = searchParams.get("activityScope");
        const isAssignedActivityScope = activityScope === "assigned";
        const session: any = await auth();

        if (!session) {
            return NextResponse.json({ message: "Un-Authorized Access" }, { status: 401 });
        }
        
        let task = await Business_Tasks.findById(taskid);
        if(task){
            const userId = resolveSessionUserId(session);
            const projectTaskAccess = task.is_project_task
                ? await resolveProjectTaskStaffAccess(task, userId)
                : null;
            const activeBusinessAccess = isAssignedActivityScope
                ? projectTaskAccess?.canViewTask ?? await hasStaffTaskAccess(task, userId)
                : await AdminAssignBusiness.exists({ user_id: userId, business_id: task.business_id, status: 1 });
            if (!activeBusinessAccess) {
                return NextResponse.json({ message: "Forbidden" }, { status: 403 });
            }
            const canManageActivities = task.is_project_task
                ? Boolean(projectTaskAccess?.canManageActivities)
                : Boolean(activeBusinessAccess);
            const canAssignActivities = task.is_project_task
                ? Boolean(projectTaskAccess?.canAssignActivities)
                : canManageActivities;
            const restrictActivities = isAssignedActivityScope && task.is_project_task
                ? !projectTaskAccess?.canViewAllActivities
                : isAssignedActivityScope && !canManageActivities;
            const assignedActivityQuery: any = restrictActivities
                ? {
                    task_id: taskid,
                    $or: [
                        { assigned_to: userId },
                        { forwarded_to: userId },
                    ],
                }
                : null;

            const taskObj = task.toObject();
            const activities = await Task_Activities.find(
                restrictActivities ? assignedActivityQuery : {task_id: taskid}
            )
                .populate({ path: "created_by", select: "name email avatar_url" })
                .populate({ path: "assigned_to", select: "name email avatar_url" })
                .populate({ path: "forwarded_to", select: "name email avatar_url" })
                .populate({ path: "reassignment_history.actor_id", select: "name email avatar_url" })
                .populate({ path: "reassignment_history.recipient_id", select: "name email avatar_url" })
                .populate({ path: "reassignment_history.previous_recipient_id", select: "name email avatar_url" })
                .populate({ path: "assigned_skill", select: "skill_name" });
            const activitiesWithUnread = await addUnreadCommentCounts(activities, userId);
            if(activities.length > 0 || isAssignedActivityScope) taskObj.activities = activitiesWithUnread;
            taskObj.creator_details = await Users.findById(task.creator).select("name email avatar_url");
            taskObj.permissions = {
                canManageActivities,
                canAssignActivities,
                canViewAllActivities: task.is_project_task
                    ? Boolean(projectTaskAccess?.canViewAllActivities)
                    : true,
            };
            if(task.is_project_task){
                const teamIds = normalizeProjectTaskTeamIds(task.assigned_teams);
                const assigned_teams = await Project_Teams.find({ _id: { $in: teamIds } })
                    .select("team_name team_head")
                    .populate({ path: "team_head", select: "name email avatar_url" });
                const project_details = await Business_Project.findById(task.project_id).select("project_name");
                taskObj.assigned_teams = assigned_teams;
                taskObj.project_details = project_details;
            } else {
                const assigned_user= await Users.findById(task.assigned_to).select("name");
                taskObj.assigned_user = assigned_user;
            }
            return NextResponse.json({data: taskObj}, {status:200});
        } else {
            return NextResponse.json({message: "No Content"}, {status:203});
        }
    }catch(err){
        console.log("error while getting task by id", err);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}
