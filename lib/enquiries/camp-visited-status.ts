export const CAMP_VISITED_STATUS_VALUES = [
    "Visited",
    "To Visit",
    "Cancelled",
    "Just Added",
    "Awarded",
] as const;

export type CampVisitedStatus = (typeof CAMP_VISITED_STATUS_VALUES)[number];

// Shared by enquiry writes and the map aggregation so marker colours follow
// the owning business's enquiry, including legacy status spellings.
export const ENQUIRY_MAP_STATUS_GROUPS: ReadonlyArray<{ status: CampVisitedStatus; values: readonly string[] }> = [
    { status: "To Visit", values: ["To Visit", "Lead Received", "Lead Recieved"] },
    { status: "Visited", values: ["Visited", "Initial Meeting Over", "Survey Completed", "Proposal Submitted", "Waiting For Client Response"] },
    { status: "Cancelled", values: ["Cancelled", "On Hold", "On hold", "On Hold / Cancelled"] },
    { status: "Awarded", values: ["Project Awarded", "Awarded", "Awareded"] },
    { status: "Just Added", values: ["Just Added"] },
];

export const getCampVisitedStatusFromEnquiryStatus = (
    enquiryStatus?: string | null
): CampVisitedStatus | null => {
    const value = (enquiryStatus || "").trim();
    return ENQUIRY_MAP_STATUS_GROUPS.find(group => group.values.includes(value))?.status || null;
};

export const normalizeCampVisitedStatusForMap = (value?: string | null) => {
    switch ((value || "").trim()) {
        case "Visited":
        case "To Visit":
        case "Just Added":
            return value as "Visited" | "To Visit" | "Just Added";
        case "Awarded":
        case "Project Awarded":
        case "Awareded":
            return "Awarded";
        case "On Hold":
        case "On hold":
        case "Cancelled":
        case "On Hold / Cancelled":
            return "On Hold / Cancelled";
        default:
            return "Just Added";
    }
};
