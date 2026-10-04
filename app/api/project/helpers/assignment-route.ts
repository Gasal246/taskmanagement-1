import { notifyProjectAssignmentChange } from "@/app/api/helpers/project-assignment-notifications";
import Business_Project from "@/models/business_project.model";
import Flow_Log from "@/models/Flow_Log.model";
import Users from "@/models/users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { authorizeProjectRequest, isActiveStaffInProjectBusiness } from "@/app/api/helpers/project-access";
import { inTransaction } from "@/lib/jobs/transaction";

type AssignmentConfig = {
    field: "account_managers" | "site_operational_heads" | "project_heads" | "project_supervisors";
    singularLabel: string;
    pluralLabel: string;
    notificationRole: "account-manager" | "site-operational-head" | "project-head" | "project-supervisor";
};
const normalizeIds = (project: any, field: AssignmentConfig["field"]) => [...new Set<string>([
    ...(Array.isArray(project[field]) ? project[field] : []),
    ...(field === "project_heads" && project.project_head ? [project.project_head] : []),
].map(String).filter(value => mongoose.isValidObjectId(value)))];

async function changeAssignment(req: NextRequest, config: AssignmentConfig, event: "assigned" | "removed") {
    let params: any;
    try {
        params = event === "assigned" ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
    } catch {
        return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }
    try {
        const { project_id, user_id } = params || {};
        if (typeof project_id !== "string" || typeof user_id !== "string"
            || !mongoose.isValidObjectId(project_id) || !mongoose.isValidObjectId(user_id)) {
            return NextResponse.json({ message: "Invalid project or user id" }, { status: 400 });
        }
        const authorization = await authorizeProjectRequest(project_id, "manage");
        if (!authorization.ok) return authorization.response;
        if (event === "assigned" && !await isActiveStaffInProjectBusiness(authorization.access.project, user_id)) {
            return NextResponse.json({ message: "Target must be an active staff member in this business" }, { status: 400 });
        }
        const result = await inTransaction(async dbSession => {
            const project = await Business_Project.findById(project_id).session(dbSession);
            if (!project) return { message: "Project not found", status: 404 };
            if (event === "assigned" && !await isActiveStaffInProjectBusiness(project, user_id, dbSession)) {
                return { message: "Target must be active staff in this business", status: 400 };
            }
            const current = normalizeIds(project, config.field);
            const hasAssignment = current.includes(String(user_id));
            if (hasAssignment === (event === "assigned")) {
                return { message: event === "assigned"
                    ? `User is already assigned as ${config.singularLabel.toLowerCase()}`
                    : `User is not assigned as ${config.singularLabel.toLowerCase()}`, status: 200 };
            }
            project[config.field] = event === "assigned" ? [...current, user_id] : current.filter(id => id !== user_id);
            if (config.field === "project_heads") project.project_head = project.project_heads[0] || null;
            await project.save({ session: dbSession });
            const actor = await Users.findById(authorization.userId).select("name").session(dbSession);
            const target = await Users.findById(user_id).select("name").session(dbSession);
            const verb = event === "assigned" ? "Added" : "Removed";
            const log = await new Flow_Log({ user_id: authorization.userId,
                Log: `${config.singularLabel} ${verb} by - ${actor?.name || "Unknown"}`,
                description: event === "assigned"
                    ? `${target?.name || "User"} added as ${config.singularLabel.toLowerCase()}.`
                    : `${target?.name || "User"} removed from ${config.pluralLabel.toLowerCase()}.`, project_id,
            }).save({ session: dbSession });
            await notifyProjectAssignmentChange({ recipientIds: [user_id], actorId: authorization.userId,
                projectId: project_id, projectName: project.project_name || "project", role: config.notificationRole,
                event, dbSession, eventKey: `assignment:${log._id}`,
            });
            return { message: `${config.singularLabel} ${event === "assigned" ? "added" : "removed"}`, status: 200 };
        });
        return NextResponse.json(result, { status: result.status });
    } catch {
        console.error("Project assignment change failed");
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
export const addProjectAssignment = (req: NextRequest, config: AssignmentConfig) => changeAssignment(req, config, "assigned");
export const removeProjectAssignment = (req: NextRequest, config: AssignmentConfig) => changeAssignment(req, config, "removed");
