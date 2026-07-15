import FcmTokens from "@/models/fcm_tokens.model";
import Notifications from "@/models/notifications.model";
import { getAdminMessaging } from "@/lib/firebaseAdmin";
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
}: {
  task: any;
  activity: any;
  comment: any;
  actor: any;
  action: "commented" | "replied";
}) {
  const viewers = await getActivityViewerIds(task, activity);
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

  await Notifications.insertMany(
    recipientIds.map((recipientId) => ({
      recipient_id: recipientId,
      sender_id: actor._id,
      kind: "task-activity-comment",
      title,
      body,
      data,
      meta,
      read_at: null,
    }))
  );

  const tokenDocs = await FcmTokens.find({ user_id: { $in: recipientIds } }, { token: 1 }).lean();
  const tokens = tokenDocs.map((doc: any) => doc.token).filter(Boolean);
  if (!tokens.length) return;

  try {
    const response = await getAdminMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body: `${actor.name || "Someone"}: ${body}` },
      data,
    });
    const invalidTokens = response.responses.flatMap((result, index) => {
      const code = result.error?.code || "";
      return code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
        ? [tokens[index]]
        : [];
    });
    if (invalidTokens.length) await FcmTokens.deleteMany({ token: { $in: invalidTokens } });
  } catch (error) {
    console.log("Failed to send activity comment notification", error);
  }
}
