import connectDB from "@/lib/mongo";
import { addProjectAssignment, removeProjectAssignment } from "@/app/api/project/helpers/assignment-route";
import { NextRequest } from "next/server";
const config = { field: "project_supervisors" as const, singularLabel: "Project Supervisor", pluralLabel: "Project Supervisors", notificationRole: "project-supervisor" as const };
export const POST = (req: NextRequest) => connectDB().then(() => addProjectAssignment(req, config));
export const DELETE = (req: NextRequest) => connectDB().then(() => removeProjectAssignment(req, config));
