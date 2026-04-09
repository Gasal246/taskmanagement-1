import { notifyProjectAssignmentChange } from "@/app/api/helpers/project-assignment-notifications";

type ProjectHeadNotificationEvent = "assigned" | "removed";

export async function notifyProjectHeadChange({
  recipientIds,
  actorId,
  projectId,
  projectName,
  event,
}: {
  recipientIds: string[];
  actorId?: string | null;
  projectId: string;
  projectName: string;
  event: ProjectHeadNotificationEvent;
}) {
  await notifyProjectAssignmentChange({
    recipientIds,
    actorId,
    projectId,
    projectName,
    role: "project-head",
    event,
  });
}
