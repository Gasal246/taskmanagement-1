import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import Flow_Log from "@/models/Flow_Log.model";
import Users from "@/models/users.model";

connectDB();

interface Body {
    project_id: string,
    project_name: string,
    project_description: string,
    status: string,
    start_date: Date,
    end_date: Date,
    priority: string,
    type: string
}

export async function PUT(req: NextRequest) {
    try {
        const body: Body = await req.json();
        if (!body.project_id) return NextResponse.json({ message: "Please Provide project_id" }, { status: 400 });

        const session: any = await getServerSession(authOptions);
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const user = await Users.findById(session?.user?.id).select("name");

        const projectToUpdate = await Business_Project.findByIdAndUpdate(body.project_id, {
            $set: {
                project_name: body.project_name,
                project_description: body.project_description,
                status: body.status,
                start_date: body.start_date,
                end_date: body.end_date,
                type: body.type,
                priority: body.priority
            }
        });

        if (body.status == "completed" && projectToUpdate.status != "completed") {
            const completedFlow = new Flow_Log({
                user_id: session?.user?.id,
                Log: `Project Marked as Completed by - ${user.name}`,
                description: "Project Completed",
                project_id: body.project_id
            });
            await completedFlow.save();
        } else {
            const updatedFlow = new Flow_Log({
                user_id: session?.user?.id,
                Log: `Project Edited by -${user.name}`,
                description: "Project edited",
                project_id: body.project_id
            });

            await updatedFlow.save();
        }


        return NextResponse.json({ message: "Project Updated" }, { status: 200 });
    } catch (err) {
        console.log("error while updating project", err);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}