import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import { NextRequest, NextResponse } from "next/server";
import Flow_Log from "@/models/Flow_Log.model";
import Users from "@/models/users.model";
import { notifyProjectHeadChange } from "@/app/api/helpers/project-head-notifications";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";

connectDB();

export async function PUT(req:NextRequest){
    try{

        const {searchParams} = new URL(req.url);
        const project_id = searchParams.get("project_id");
        if(!project_id) return NextResponse.json({message:"Please Provide project_id"}, {status: 400});
        const authorization = await authorizeProjectRequest(project_id, "approve");
        if (!authorization.ok) return authorization.response;
        const user = await Users.findById(authorization.userId);

        const projectToApprove = await Business_Project.findByIdAndUpdate(project_id, {
            $set: {is_approved: true, approved_by:authorization.userId, status: "approved"}
        }, {new:true})

        const flowLog = new Flow_Log({
            user_id: authorization.userId,
            Log: `Project Approved by BUSINESS ADMIN - ${user?.name}`,
            description: "Project marked as approved",
            project_id: project_id
        });

        await flowLog.save();

        const projectHeadIds = Array.from(
            new Set(
                [
                    ...(Array.isArray(projectToApprove?.project_heads) ? projectToApprove.project_heads : []),
                    projectToApprove?.project_head,
                ]
                    .filter(Boolean)
                    .map((id: any) => id?.toString?.() ?? String(id))
            )
        );

        if (projectHeadIds.length > 0) {
            await notifyProjectHeadChange({
                recipientIds: projectHeadIds,
                actorId: authorization.userId,
                projectId: String(projectToApprove?._id || project_id),
                projectName: projectToApprove?.project_name || "project",
                event: "assigned",
            });
        }

        return NextResponse.json({message: "Project marked as Approved"}, {status: 200});

    }catch(err){
        console.log("project approval failed", err);
        return NextResponse.json({message: "Internal Server Error"}, {status:500});
    }
}
