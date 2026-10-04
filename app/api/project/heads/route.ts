import connectDB from "@/lib/mongo";
import { addProjectAssignment, removeProjectAssignment } from "@/app/api/project/helpers/assignment-route";
import { NextRequest } from "next/server";
const config = { field: "project_heads" as const, singularLabel: "Project Head", pluralLabel: "Project Heads", notificationRole: "project-head" as const };
export const POST = (req: NextRequest) => connectDB().then(() => addProjectAssignment(req, config));
export const DELETE = (req: NextRequest) => connectDB().then(() => removeProjectAssignment(req, config));
