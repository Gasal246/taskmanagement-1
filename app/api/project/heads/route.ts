import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Flow_Log from "@/models/Flow_Log.model";
import Users from "@/models/users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { notifyProjectHeadChange } from "@/app/api/helpers/project-head-notifications";

connectDB();

const normalizeHeadIds = (project: any) => {
    const rawIds = [
        ...(Array.isArray(project?.project_heads) ? project.project_heads : []),
        project?.project_head,
    ]
        .filter(Boolean)
        .map((id: any) => id?.toString?.() ?? String(id))
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id));

    return Array.from(new Set(rawIds));
};

export async function POST(req: NextRequest) {
    try {
        const session: any = await auth();
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const { project_id, user_id } = await req.json();
        if (!mongoose.Types.ObjectId.isValid(project_id) || !mongoose.Types.ObjectId.isValid(user_id)) {
            return NextResponse.json({ message: "Invalid project or user id" }, { status: 400 });
        }

        const project = await Business_Project.findById(project_id);
        if (!project) {
            return NextResponse.json({ message: "Project not found" }, { status: 404 });
        }

        const existingHeadIds = normalizeHeadIds(project);
        if (existingHeadIds.includes(String(user_id))) {
            return NextResponse.json({ message: "User is already a project head", status: 200 }, { status: 200 });
        }

        const nextHeadIds = [...existingHeadIds, String(user_id)];
        project.project_heads = nextHeadIds;
        project.project_head = nextHeadIds[0] || null;
        await project.save();

        const [actor, targetUser] = await Promise.all([
            Users.findById(session?.user?.id).select("name"),
            Users.findById(user_id).select("name"),
        ]);

        await new Flow_Log({
            user_id: session?.user?.id,
            Log: `Project Head Added by - ${actor?.name || "Unknown"}`,
            description: `${targetUser?.name || "User"} added as project head.`,
            project_id,
        }).save();

        await notifyProjectHeadChange({
            recipientIds: [String(user_id)],
            actorId: session?.user?.id,
            projectId: String(project_id),
            projectName: project?.project_name || "project",
            event: "assigned",
        });

        return NextResponse.json({ message: "Project head added", status: 200 }, { status: 200 });
    } catch (error) {
        console.log("Error while adding project head", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session: any = await auth();
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const { searchParams } = new URL(req.url);
        const project_id = searchParams.get("project_id");
        const user_id = searchParams.get("user_id");

        if (!mongoose.Types.ObjectId.isValid(project_id || "") || !mongoose.Types.ObjectId.isValid(user_id || "")) {
            return NextResponse.json({ message: "Invalid project or user id" }, { status: 400 });
        }

        const project = await Business_Project.findById(project_id);
        if (!project) {
            return NextResponse.json({ message: "Project not found" }, { status: 404 });
        }

        const existingHeadIds = normalizeHeadIds(project);
        const nextHeadIds = existingHeadIds.filter((id) => id !== String(user_id));

        project.project_heads = nextHeadIds;
        project.project_head = nextHeadIds[0] || null;
        await project.save();

        const [actor, targetUser] = await Promise.all([
            Users.findById(session?.user?.id).select("name"),
            Users.findById(user_id).select("name"),
        ]);

        await new Flow_Log({
            user_id: session?.user?.id,
            Log: `Project Head Removed by - ${actor?.name || "Unknown"}`,
            description: `${targetUser?.name || "User"} removed from project heads.`,
            project_id,
        }).save();

        await notifyProjectHeadChange({
            recipientIds: [String(user_id)],
            actorId: session?.user?.id,
            projectId: String(project_id),
            projectName: project?.project_name || "project",
            event: "removed",
        });

        return NextResponse.json({ message: "Project head removed", status: 200 }, { status: 200 });
    } catch (error) {
        console.log("Error while removing project head", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
