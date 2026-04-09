import { getAdminMessaging } from "@/lib/firebaseAdmin";
import FcmTokens from "@/models/fcm_tokens.model";
import Notifications from "@/models/notifications.model";
import Users from "@/models/users.model";

type ProjectAssignmentRole =
  | "project-head"
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
}: {
  recipientIds: string[];
  actorId?: string | null;
  projectId: string;
  projectName: string;
  role: ProjectAssignmentRole;
  event: ProjectAssignmentEvent;
  teamId?: string | null;
  teamName?: string | null;
}) {
  const recipients = toUniqueIds(recipientIds);
  if (recipients.length === 0) return;

  const actor = actorId
    ? await Users.findById(actorId).select("name").lean<{ name?: string }>()
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

  await Notifications.insertMany(
    recipients.map((recipientId) => ({
      recipient_id: recipientId,
      sender_id: actorId || null,
      kind: roleConfig.kind,
      title,
      body,
      data,
      meta,
      read_at: null,
    }))
  );

  const tokenDocs = await FcmTokens.find(
    { user_id: { $in: recipients } },
    { token: 1 }
  ).lean();
  const tokens = tokenDocs.map((doc: any) => doc?.token).filter(Boolean);
  if (tokens.length === 0) return;

  try {
    const messaging = getAdminMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
      ),
    });

    const invalidTokens = response.responses
      .map((res, index) => {
        const code = res.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          return tokens[index];
        }
        return null;
      })
      .filter(Boolean) as string[];

    if (invalidTokens.length > 0) {
      await FcmTokens.deleteMany({ token: { $in: invalidTokens } });
    }
  } catch (error) {
    console.log("Failed to send project assignment notification", error);
  }
}
