import type { ClientSession } from "mongoose";
import { notifyProjectAssignmentChange } from "@/app/api/helpers/project-assignment-notifications";

type ProjectHeadNotificationEvent = "assigned" | "removed";

export async function notifyProjectHeadChange({
  recipientIds,
  actorId,
  projectId,
  projectName,
  event,
  dbSession,
  eventKey,
}: {
  recipientIds: string[];
  actorId?: string | null;
  projectId: string;
  projectName: string;
  event: ProjectHeadNotificationEvent;
  dbSession: ClientSession;
  eventKey: string;
}) {
  await notifyProjectAssignmentChange({
    recipientIds,
    actorId,
    projectId,
    projectName,
    role: "project-head",
    event, dbSession, eventKey,
  });
}
