import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Flow_Log from "@/models/Flow_Log.model";
import Users from "@/models/users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

const normalizeSupervisorIds = (project: any) => {
    const rawIds = (Array.isArray(project?.project_supervisors) ? project.project_supervisors : [])
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

        const existingSupervisorIds = normalizeSupervisorIds(project);
        if (existingSupervisorIds.includes(String(user_id))) {
            return NextResponse.json({ message: "User is already a project supervisor", status: 200 }, { status: 200 });
        }

        const nextSupervisorIds = [...existingSupervisorIds, String(user_id)];
        project.project_supervisors = nextSupervisorIds;
        await project.save();

        const [actor, targetUser] = await Promise.all([
            Users.findById(session?.user?.id).select("name"),
            Users.findById(user_id).select("name"),
        ]);

        await new Flow_Log({
            user_id: session?.user?.id,
            Log: `Project Supervisor Added by - ${actor?.name || "Unknown"}`,
            description: `${targetUser?.name || "User"} added as project supervisor.`,
            project_id,
        }).save();

        return NextResponse.json({ message: "Project supervisor added", status: 200 }, { status: 200 });
    } catch (error) {
        console.log("Error while adding project supervisor", error);
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

        const existingSupervisorIds = normalizeSupervisorIds(project);
        const nextSupervisorIds = existingSupervisorIds.filter((id) => id !== String(user_id));

        project.project_supervisors = nextSupervisorIds;
        await project.save();

        const [actor, targetUser] = await Promise.all([
            Users.findById(session?.user?.id).select("name"),
            Users.findById(user_id).select("name"),
        ]);

        await new Flow_Log({
            user_id: session?.user?.id,
            Log: `Project Supervisor Removed by - ${actor?.name || "Unknown"}`,
            description: `${targetUser?.name || "User"} removed from project supervisors.`,
            project_id,
        }).save();

        return NextResponse.json({ message: "Project supervisor removed", status: 200 }, { status: 200 });
    } catch (error) {
        console.log("Error while removing project supervisor", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
