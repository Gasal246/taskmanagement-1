import { enqueueNotifications } from "@/lib/jobs/enqueue";
import type { ClientSession } from "mongoose";
import Users from "@/models/users.model";

type ProjectAssignmentRole =
  | "project-head"
  | "account-manager"
  | "site-operational-head"
  | "project-supervisor"
  | "team-head"
  | "team-member";

type ProjectAssignmentEvent = "assigned" | "removed";

const ROLE_CONFIG: Record<
  ProjectAssignmentRole,
  { title: string; kind: string }
> = {
  "project-head": {
    title: "Project Head",
    kind: "project-head",
  },
  "account-manager": {
    title: "Account Manager",
    kind: "account-manager",
  },
  "site-operational-head": {
    title: "Site Head / Operational Head",
    kind: "site-operational-head",
  },
  "project-supervisor": {
    title: "Project Supervisor",
    kind: "project-supervisor",
  },
  "team-head": {
    title: "Team Head",
    kind: "project-team",
  },
  "team-member": {
    title: "Team Member",
    kind: "project-team",
  },
};

const toUniqueIds = (ids: string[]) =>
  Array.from(new Set(ids.filter(Boolean).map((id) => String(id))));

export async function notifyProjectAssignmentChange({
  recipientIds,
  actorId,
  projectId,
  projectName,
  role,
  event,
  teamId,
  teamName,
  dbSession,
  eventKey,
}: {
  recipientIds: string[];
  actorId?: string | null;
  projectId: string;
  projectName: string;
  role: ProjectAssignmentRole;
  event: ProjectAssignmentEvent;
  teamId?: string | null;
  teamName?: string | null;
  dbSession: ClientSession;
  eventKey: string;
}) {
  const recipients = toUniqueIds(recipientIds);
  if (recipients.length === 0) return;

  const actor = actorId
    ? await Users.findById(actorId).select("name").session(dbSession).lean<{ name?: string }>()
    : null;
  const actorName = actor?.name?.trim() || "Unknown";
  const roleConfig = ROLE_CONFIG[role];
  const teamSuffix = teamName ? ` in team ${teamName}` : "";
  const title =
    event === "assigned"
      ? `${roleConfig.title} Assigned`
      : `${roleConfig.title} Removed`;
  const body =
    event === "assigned"
      ? `You were assigned as ${roleConfig.title} in project ${projectName}${teamSuffix} by ${actorName}.`
      : `You were removed as ${roleConfig.title} from project ${projectName}${teamSuffix} by ${actorName}.`;

  const data = {
    type: roleConfig.kind,
    role,
    event,
    projectId: String(projectId),
    projectName: String(projectName),
    actorName,
    ...(teamId ? { teamId: String(teamId) } : {}),
    ...(teamName ? { teamName: String(teamName) } : {}),
  };

  const meta = {
    ...data,
    byLine: actorName,
    link: `/staff/projects/${projectId}`,
  };

  await enqueueNotifications(
    recipients.map((recipientId) => ({
      recipient_id: recipientId,
      sender_id: actorId || null,
      kind: roleConfig.kind,
      title,
      body,
      data,
      meta,
      read_at: null,
    })),
    { notification: { title, body }, data },
    `${eventKey}:${role}:${event}`, dbSession
  );

}
