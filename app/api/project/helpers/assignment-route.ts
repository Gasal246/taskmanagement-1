import { auth } from "@/auth";
import { notifyProjectAssignmentChange } from "@/app/api/helpers/project-assignment-notifications";
import Business_Project from "@/models/business_project.model";
import Flow_Log from "@/models/Flow_Log.model";
import Users from "@/models/users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type AssignmentConfig = {
    field: "account_managers" | "site_operational_heads";
    singularLabel: string;
    pluralLabel: string;
    notificationRole: "account-manager" | "site-operational-head";
};

const normalizeIds = (project: any, field: AssignmentConfig["field"]) =>
    Array.from(new Set(
        (Array.isArray(project?.[field]) ? project[field] : [])
            .filter(Boolean)
            .map((id: any) => id?.toString?.() ?? String(id))
            .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
    ));

export async function addProjectAssignment(req: NextRequest, config: AssignmentConfig) {
    try {
        const session: any = await auth();
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const { project_id, user_id } = await req.json();
        if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
            return NextResponse.json({ message: "Invalid project or user id" }, { status: 400 });
        }

        const project: any = await Business_Project.findById(project_id);
        if (!project) return NextResponse.json({ message: "Project not found" }, { status: 404 });

        const existingIds = normalizeIds(project, config.field);
        if (existingIds.includes(String(user_id))) {
            return NextResponse.json({ message: `User is already assigned as ${config.singularLabel.toLowerCase()}`, status: 200 }, { status: 200 });
        }

        project[config.field] = [...existingIds, String(user_id)];
        await project.save();

        const [actor, targetUser] = await Promise.all([
            Users.findById(session?.user?.id).select("name"),
            Users.findById(user_id).select("name"),
        ]);
        await new Flow_Log({
            user_id: session?.user?.id,
            Log: `${config.singularLabel} Added by - ${actor?.name || "Unknown"}`,
            description: `${targetUser?.name || "User"} added as ${config.singularLabel.toLowerCase()}.`,
            project_id,
        }).save();
        await notifyProjectAssignmentChange({
            recipientIds: [String(user_id)],
            actorId: session?.user?.id,
            projectId: String(project_id),
            projectName: project?.project_name || "project",
            role: config.notificationRole,
            event: "assigned",
        });

        return NextResponse.json({ message: `${config.singularLabel} added`, status: 200 }, { status: 200 });
    } catch (error) {
        console.log(`Error while adding ${config.singularLabel.toLowerCase()}`, error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function removeProjectAssignment(req: NextRequest, config: AssignmentConfig) {
    try {
        const session: any = await auth();
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const { searchParams } = new URL(req.url);
        const project_id = searchParams.get("project_id");
        const user_id = searchParams.get("user_id");
        if (!mongoose.Types.ObjectId.isValid(project_id || "") || !mongoose.Types.ObjectId.isValid(user_id || "")) {
            return NextResponse.json({ message: "Invalid project or user id" }, { status: 400 });
        }

        const project: any = await Business_Project.findById(project_id);
        if (!project) return NextResponse.json({ message: "Project not found" }, { status: 404 });

        project[config.field] = normalizeIds(project, config.field).filter((id) => id !== String(user_id));
        await project.save();

        const [actor, targetUser] = await Promise.all([
            Users.findById(session?.user?.id).select("name"),
            Users.findById(user_id).select("name"),
        ]);
        await new Flow_Log({
            user_id: session?.user?.id,
            Log: `${config.singularLabel} Removed by - ${actor?.name || "Unknown"}`,
            description: `${targetUser?.name || "User"} removed from ${config.pluralLabel.toLowerCase()}.`,
            project_id,
        }).save();
        await notifyProjectAssignmentChange({
            recipientIds: [String(user_id)],
            actorId: session?.user?.id,
            projectId: String(project_id),
            projectName: project?.project_name || "project",
            role: config.notificationRole,
            event: "removed",
        });

        return NextResponse.json({ message: `${config.singularLabel} removed`, status: 200 }, { status: 200 });
    } catch (error) {
        console.log(`Error while removing ${config.singularLabel.toLowerCase()}`, error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
