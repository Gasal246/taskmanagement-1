export const CAMP_VISITED_STATUS_VALUES = [
    "Visited",
    "To Visit",
    "Cancelled",
    "Just Added",
    "Awarded",
] as const;

export type CampVisitedStatus = (typeof CAMP_VISITED_STATUS_VALUES)[number];

export const getCampVisitedStatusFromEnquiryStatus = (
    enquiryStatus?: string | null
): CampVisitedStatus | null => {
    switch ((enquiryStatus || "").trim()) {
        case "Lead Received":
        case "Lead Recieved":
            return "To Visit";
        case "Initial Meeting Over":
        case "Survey Completed":
        case "Proposal Submitted":
        case "Waiting For Client Response":
            return "Visited";
        case "On Hold":
            return "Cancelled";
        case "Project Awarded":
        case "Awarded":
        case "Awareded":
            return "Awarded";
        default:
            return null;
    }
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
