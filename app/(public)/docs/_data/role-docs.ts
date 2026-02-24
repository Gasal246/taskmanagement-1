export type RoleSlug =
  | "task-manager"
  | "business-admin"
  | "regions"
  | "region-heads"
  | "region-departments"
  | "areas"
  | "region-department-heads"
  | "area-heads"
  | "region-staffs"
  | "area-departments"
  | "locations"
  | "region-department-staffs"
  | "area-department-head"
  | "location-heads"
  | "location-departments"
  | "location-staffs";

export type ContextSlug =
  | "role-purpose"
  | "operational-scope"
  | "execution-playbook"
  | "quality-growth";

export interface RoleContext {
  slug: ContextSlug;
  title: string;
  summary: string;
  innerContexts: {
    title: string;
    summary: string;
  }[];
}

export interface RoleDocumentation {
  slug: RoleSlug;
  title: string;
  parentSlug: RoleSlug | null;
  overview: string;
  responsibilities: string[];
  contexts: RoleContext[];
}

export interface RoleTreeNode {
  id: string;
  title: string;
  roleSlug: RoleSlug;
  children: RoleTreeNode[];
}

const roleDefinitions: Array<Omit<RoleDocumentation, "contexts">> = [
  {
    slug: "task-manager",
    title: "Task Manager",
    parentSlug: null,
    overview:
      "The top-level operating role that aligns people, process, and delivery quality across every layer of the application.",
    responsibilities: [
      "Own organization-wide planning standards",
      "Keep execution flow visible from region to location",
      "Drive continuous improvement across all management levels",
    ],
  },
  {
    slug: "business-admin",
    title: "Business Admin",
    parentSlug: "task-manager",
    overview:
      "The executive coordination role responsible for business-level governance, priorities, and resource readiness.",
    responsibilities: [
      "Translate strategy into operational plans",
      "Approve structural changes across regions",
      "Maintain accountability with all reporting units",
    ],
  },
  {
    slug: "regions",
    title: "Regions",
    parentSlug: "business-admin",
    overview:
      "The regional management layer that converts business direction into actionable plans for departments and areas.",
    responsibilities: [
      "Coordinate multi-area activities",
      "Balance workload and capacity by region",
      "Maintain regional quality and delivery consistency",
    ],
  },
  {
    slug: "region-heads",
    title: "Region Heads",
    parentSlug: "regions",
    overview:
      "Leadership role for regional execution, decision-making, and cross-team issue resolution.",
    responsibilities: [
      "Lead region-level operational reviews",
      "Mentor and align department and area heads",
      "Escalate critical risks early with clear action plans",
    ],
  },
  {
    slug: "region-departments",
    title: "Region Departments",
    parentSlug: "regions",
    overview:
      "Regional departments own focused capability delivery and convert plans into team-level workflows.",
    responsibilities: [
      "Define department operating rhythms",
      "Track outcome quality and delivery pace",
      "Support regional prioritization with reliable execution data",
    ],
  },
  {
    slug: "areas",
    title: "Areas",
    parentSlug: "regions",
    overview:
      "Area units localize regional direction and coordinate near-field execution across locations.",
    responsibilities: [
      "Convert regional goals into area milestones",
      "Coordinate location-level dependencies",
      "Surface local constraints with practical solutions",
    ],
  },
  {
    slug: "region-department-heads",
    title: "Region Department Heads",
    parentSlug: "region-heads",
    overview:
      "Regional department leadership role responsible for staffing, standards, and predictable delivery output.",
    responsibilities: [
      "Lead department planning and staffing",
      "Coach team leads and maintain performance standards",
      "Report structured progress to region heads",
    ],
  },
  {
    slug: "area-heads",
    title: "Area Heads",
    parentSlug: "region-heads",
    overview:
      "Area leadership role ensuring smooth handoff from regional planning to location execution.",
    responsibilities: [
      "Direct area-level schedules and priorities",
      "Coordinate with location heads on risk and capacity",
      "Provide stable status reporting to regional leadership",
    ],
  },
  {
    slug: "region-staffs",
    title: "Region Staffs",
    parentSlug: "region-heads",
    overview:
      "Operational contributors at region level who execute assigned functions and support cross-area delivery.",
    responsibilities: [
      "Deliver assigned tasks on schedule",
      "Update progress and blockers proactively",
      "Support region-wide initiatives and operational coverage",
    ],
  },
  {
    slug: "area-departments",
    title: "Area Departments",
    parentSlug: "region-departments",
    overview:
      "Area department layer that translates department mandates into localized execution streams.",
    responsibilities: [
      "Own area-level department planning",
      "Coordinate with location departments",
      "Maintain compliance with regional standards",
    ],
  },
  {
    slug: "locations",
    title: "Locations",
    parentSlug: "areas",
    overview:
      "Execution units closest to day-to-day operations where delivery outcomes are produced and tracked.",
    responsibilities: [
      "Run location operations against agreed plans",
      "Keep delivery records accurate and current",
      "Escalate exceptions quickly through area leadership",
    ],
  },
  {
    slug: "region-department-staffs",
    title: "Region Department Staffs",
    parentSlug: "region-department-heads",
    overview:
      "Specialist staff supporting region department heads with structured execution and reporting discipline.",
    responsibilities: [
      "Execute department tasks with quality",
      "Maintain transparent updates and handovers",
      "Contribute to process consistency and documentation quality",
    ],
  },
  {
    slug: "area-department-head",
    title: "Area Department Head",
    parentSlug: "region-department-heads",
    overview:
      "Area department leadership role focused on people enablement, throughput, and local issue control.",
    responsibilities: [
      "Lead area department priorities and staffing",
      "Coordinate outcomes with area and location leaders",
      "Assure quality standards and closure discipline",
    ],
  },
  {
    slug: "location-heads",
    title: "Location Heads",
    parentSlug: "area-heads",
    overview:
      "Location leadership role accountable for execution quality, response speed, and local team alignment.",
    responsibilities: [
      "Direct location teams with clear goals",
      "Resolve operational blockers quickly",
      "Report consistent progress to area heads",
    ],
  },
  {
    slug: "location-departments",
    title: "Location Departments",
    parentSlug: "area-departments",
    overview:
      "Delivery-focused department units operating within each location under standardized processes.",
    responsibilities: [
      "Execute location-level department commitments",
      "Maintain stable workflow and handoff quality",
      "Track local metrics and support improvement actions",
    ],
  },
  {
    slug: "location-staffs",
    title: "Location Staffs",
    parentSlug: "location-heads",
    overview:
      "Frontline execution role responsible for reliable completion of location-level work items.",
    responsibilities: [
      "Deliver assigned work with accuracy",
      "Communicate status and constraints early",
      "Support positive team culture and continuous improvement",
    ],
  },
];

const roleTitleMap = new Map(roleDefinitions.map((role) => [role.slug, role.title]));

const buildContexts = (
  roleTitle: string,
  parentTitle: string | null,
): RoleContext[] => {
  const parentText = parentTitle
    ? `in alignment with the ${parentTitle} role`
    : "as the primary governance role";

  return [
    {
      slug: "role-purpose",
      title: "Role Purpose",
      summary: `Defines how ${roleTitle} creates value in the operating model and where this role drives visible outcomes.`,
      innerContexts: [
        {
          title: "Mission Alignment",
          summary: `${roleTitle} keeps day-to-day actions aligned to strategic goals ${parentText}.`,
        },
        {
          title: "Core Responsibilities",
          summary: `Clarifies ownership boundaries so ${roleTitle} can execute with confidence and consistency.`,
        },
        {
          title: "Success Signals",
          summary: `Focuses on practical indicators that confirm ${roleTitle} is producing measurable progress.`,
        },
      ],
    },
    {
      slug: "operational-scope",
      title: "Operational Scope",
      summary: `Documents decision boundaries, collaboration touchpoints, and escalation routes for ${roleTitle}.`,
      innerContexts: [
        {
          title: "Decision Boundaries",
          summary: `Specifies which decisions ${roleTitle} owns directly and which require wider approval.`,
        },
        {
          title: "Collaboration Network",
          summary: `Outlines high-value coordination channels between ${roleTitle} and adjacent roles.`,
        },
        {
          title: "Escalation Flow",
          summary: `Provides a clean escalation path so risks are solved early with the right stakeholders.`,
        },
      ],
    },
    {
      slug: "execution-playbook",
      title: "Execution Playbook",
      summary: `Presents a practical cadence for planning, delivery checks, and reliable status movement for ${roleTitle}.`,
      innerContexts: [
        {
          title: "Daily Cadence",
          summary: `Sets the baseline rhythm for updates, prioritization, and focused delivery by ${roleTitle}.`,
        },
        {
          title: "Weekly Rituals",
          summary: `Structures review rituals that maintain momentum and keep cross-team alignment stable.`,
        },
        {
          title: "Risk Prevention",
          summary: `Highlights preventative controls that reduce delays and protect delivery confidence.`,
        },
      ],
    },
    {
      slug: "quality-growth",
      title: "Quality & Growth",
      summary: `Frames how ${roleTitle} improves service quality, capability maturity, and long-term performance.`,
      innerContexts: [
        {
          title: "Service Quality",
          summary: `Defines quality checkpoints that keep outputs dependable and stakeholder-ready.`,
        },
        {
          title: "Team Development",
          summary: `Promotes coaching and capability-building practices that strengthen ${roleTitle} outcomes.`,
        },
        {
          title: "Continuous Improvement",
          summary: `Uses feedback loops to refine processes and create progressive operational wins.`,
        },
      ],
    },
  ];
};

export const roleDocs: RoleDocumentation[] = roleDefinitions.map((role) => {
  const parentTitle = role.parentSlug ? roleTitleMap.get(role.parentSlug) ?? null : null;

  return {
    ...role,
    contexts: buildContexts(role.title, parentTitle),
  };
});

export const roleDocMap = new Map<RoleSlug, RoleDocumentation>(
  roleDocs.map((role) => [role.slug, role]),
);

export const roleHierarchyTree: RoleTreeNode = {
  id: "task-manager",
  title: "Task Manager",
  roleSlug: "task-manager",
  children: [
    {
      id: "business-admin",
      title: "Business Admin",
      roleSlug: "business-admin",
      children: [
        {
          id: "regions-under-business-admin",
          title: "Regions",
          roleSlug: "regions",
          children: [],
        },
      ],
    },
    {
      id: "regions-main",
      title: "Regions",
      roleSlug: "regions",
      children: [
        {
          id: "region-heads",
          title: "Region Heads",
          roleSlug: "region-heads",
          children: [
            {
              id: "region-department-heads",
              title: "Region Department Heads",
              roleSlug: "region-department-heads",
              children: [
                {
                  id: "region-department-staffs",
                  title: "Region Department Staffs",
                  roleSlug: "region-department-staffs",
                  children: [],
                },
                {
                  id: "area-department-head",
                  title: "Area Department Head",
                  roleSlug: "area-department-head",
                  children: [],
                },
              ],
            },
            {
              id: "area-heads",
              title: "Area Heads",
              roleSlug: "area-heads",
              children: [
                {
                  id: "location-heads",
                  title: "Location Heads",
                  roleSlug: "location-heads",
                  children: [
                    {
                      id: "location-staffs",
                      title: "Location Staffs",
                      roleSlug: "location-staffs",
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              id: "region-staffs",
              title: "Region Staffs",
              roleSlug: "region-staffs",
              children: [],
            },
          ],
        },
        {
          id: "region-departments",
          title: "Region Departments",
          roleSlug: "region-departments",
          children: [
            {
              id: "area-departments",
              title: "Area Departments",
              roleSlug: "area-departments",
              children: [
                {
                  id: "location-departments",
                  title: "Location Departments",
                  roleSlug: "location-departments",
                  children: [],
                },
              ],
            },
          ],
        },
        {
          id: "areas",
          title: "Areas",
          roleSlug: "areas",
          children: [
            {
              id: "locations",
              title: "Locations",
              roleSlug: "locations",
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

export const getRoleBySlug = (roleSlug: string): RoleDocumentation | null => {
  if (!roleSlug) return null;

  return roleDocMap.get(roleSlug as RoleSlug) ?? null;
};

export const getContextBySlug = (
  role: RoleDocumentation,
  contextSlug: string,
): RoleContext | null => {
  if (!contextSlug) return null;

  return role.contexts.find((context) => context.slug === contextSlug) ?? null;
};
