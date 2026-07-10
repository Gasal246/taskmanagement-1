import connectDB from "@/lib/mongo";
import { addProjectAssignment, removeProjectAssignment } from "@/app/api/project/helpers/assignment-route";
import { NextRequest } from "next/server";

connectDB();

const config = {
    field: "site_operational_heads" as const,
    singularLabel: "Site Head / Operational Head",
    pluralLabel: "Site Heads / Operational Heads",
    notificationRole: "site-operational-head" as const,
};

export const POST = (req: NextRequest) => addProjectAssignment(req, config);
export const DELETE = (req: NextRequest) => removeProjectAssignment(req, config);
