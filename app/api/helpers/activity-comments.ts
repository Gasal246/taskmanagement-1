import AdminAssignBusiness from "@/models/admin_assign_business.model";
import ActivityCommentReads from "@/models/activity_comment_reads.model";
import ActivityComments from "@/models/activity_comments.model";
import BusinessStaffs from "@/models/business_staffs.model";
import BusinessTasks from "@/models/business_tasks.model";
import TaskActivities from "@/models/task_activities.model";
import Users from "@/models/users.model";
import mongoose from "mongoose";

export async function authorizeActivityViewer(userId: string, activityId: string) {
  const activity: any = await TaskActivities.findById(activityId).lean();
  if (!activity) return { status: 404 as const, activity: null, task: null, isAdmin: false };

  const task: any = await BusinessTasks.findById(activity.task_id).lean();
  if (!task) return { status: 404 as const, activity: null, task: null, isAdmin: false };

  const [adminAssignment, staffAssignment] = await Promise.all([
    AdminAssignBusiness.exists({ user_id: userId, business_id: task.business_id, status: 1 }),
    BusinessStaffs.exists({ user_id: userId, business_id: task.business_id, status: 1 }),
  ]);
  const activeUser = await Users.exists({ _id: userId, status: 1 });
  const isAdmin = Boolean(activeUser && adminAssignment);
  const isAssignedStaff =
    Boolean(activeUser && staffAssignment) && String(activity.assigned_to || "") === String(userId);

  if (!isAdmin && !isAssignedStaff) {
    return { status: 403 as const, activity: null, task: null, isAdmin: false };
  }
  return { status: 200 as const, activity, task, isAdmin };
}

export async function getActivityViewerIds(task: any, activity: any) {
  const admins = await AdminAssignBusiness.find({
    business_id: task.business_id,
    status: 1,
  }).select("user_id").lean();
  const ids = new Set(admins.map((row: any) => String(row.user_id || "")).filter(Boolean));

  if (activity.assigned_to) {
    const activeStaff = await BusinessStaffs.exists({
      business_id: task.business_id,
      user_id: activity.assigned_to,
      status: 1,
    });
    if (activeStaff) ids.add(String(activity.assigned_to));
  }

  const activeUsers = await Users.find({ _id: { $in: Array.from(ids) }, status: 1 })
    .select("_id")
    .lean();
  return activeUsers.map((user: any) => String(user._id));
}

export async function addUnreadCommentCounts(activities: any[], userId: string) {
  if (!activities.length) return activities;
  const activityIds = activities.map((activity: any) => activity._id);
  const viewerId = new mongoose.Types.ObjectId(userId);
  const [unread, totals] = await Promise.all([ActivityComments.aggregate([
    {
      $match: {
        activity_id: { $in: activityIds },
        author_id: { $ne: viewerId },
        deleted_at: null,
      },
    },
    {
      $lookup: {
        from: ActivityCommentReads.collection.name,
        let: { commentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$comment_id", "$$commentId"] },
                  { $eq: ["$user_id", viewerId] },
                ],
              },
            },
          },
        ],
        as: "reads",
      },
    },
    { $match: { reads: { $size: 0 } } },
    { $group: { _id: "$activity_id", count: { $sum: 1 } } },
  ]), ActivityComments.aggregate([
    { $match: { activity_id: { $in: activityIds }, deleted_at: null } },
    { $group: { _id: "$activity_id", count: { $sum: 1 } } },
  ])]);
  const countMap = new Map(unread.map((row: any) => [String(row._id), row.count]));
  const totalMap = new Map(totals.map((row: any) => [String(row._id), row.count]));
  return activities.map((activity: any) => ({
    ...(typeof activity.toObject === "function" ? activity.toObject() : activity),
    unread_comment_count: countMap.get(String(activity._id)) || 0,
    comment_count: totalMap.get(String(activity._id)) || 0,
  }));
}
