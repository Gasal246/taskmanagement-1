import { enqueueNotifications } from "@/lib/jobs/enqueue";
import type { ClientSession } from "mongoose";
import { getActivityViewerIds } from "@/app/api/helpers/activity-comments";

const excerpt = (value: string, max = 140) => {
  const text = value.trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
};

export async function notifyActivityComment({
  task,
  activity,
  comment,
  actor,
  action,
  dbSession,
  recipientIds: suppliedRecipients,
}: {
  task: any;
  activity: any;
  comment: any;
  actor: any;
  action: "commented" | "replied";
  dbSession?: ClientSession;
  recipientIds?: string[];
}) {
  const viewers = suppliedRecipients ?? await getActivityViewerIds(task, activity);
  const recipientIds = viewers.filter((id) => id !== String(actor._id));
  if (!recipientIds.length) return;

  const taskId = String(task._id);
  const activityId = String(activity._id);
  const commentId = String(comment._id);
  const body = excerpt(comment.body || comment.attachment?.name || "Attached a file");
  const title = action === "replied" ? "New Activity Reply" : "New Activity Comment";
  const linkSuffix = `?activityId=${encodeURIComponent(activityId)}&comments=open`;
  const data: Record<string, string> = {
    type: "task-activity-comment",
    taskId,
    taskName: String(task.task_name || "Task"),
    activityId,
    activityTitle: String(activity.activity || "Activity"),
    commentId,
    action,
    actorName: String(actor.name || "User"),
    linkSuffix,
  };
  const meta = { ...data, commentExcerpt: body };

  await enqueueNotifications(
    recipientIds.map((recipientId) => ({
      recipient_id: recipientId,
      sender_id: actor._id,
      kind: "task-activity-comment",
      title,
      body,
      data,
      meta,
      read_at: null,
    })),
    { notification: { title, body: `${actor.name || "Someone"}: ${body}` }, data },
    `comment:${commentId}`, dbSession
  );

}
