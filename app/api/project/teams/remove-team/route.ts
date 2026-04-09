import { auth } from "@/auth";
import { notifyProjectAssignmentChange } from "@/app/api/helpers/project-assignment-notifications";
import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Project_Teams from "@/models/project_team.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req:NextRequest){
    try{

         const session: any = await auth();
        if(!session) return NextResponse.json({message: "Un Authorized Access", status: 401}, { status: 401 });
        
        const username = await Users.findById(session?.user?.id).select("name");

        const {searchParams} = new URL(req.url);
        const team_id = searchParams.get("team_id");

        const isTaskAssigned = await Business_Tasks.find({is_project_task: true, assigned_teams: team_id});

        if(isTaskAssigned.length > 0){
            return NextResponse.json({message: "This team cannot be deleted because there are tasks currently assigned to it.", status: 400}, {status: 400});
        }

        const teamMembers = await Project_Team_Members.find({project_team_id:team_id}).select("user_id").lean();
        await Project_Team_Members.deleteMany({project_team_id:team_id});
        const deleted = await Project_Teams.findOneAndDelete({_id:team_id});
        if (!deleted) {
            return NextResponse.json({message:"Team not found", status:404}, {status:404});
        }
        const project = deleted?.project_id
            ? await Business_Project.findById(deleted.project_id).select("project_name")
            : null;


        const flow = new Flow_Log({
            user_id: session?.user?.id,
            project_id: deleted?.project_id,
            Log: `Team (${deleted.team_name}) has been deleted by ${username?.name}`,
            description: "A Project team has been deleted"
        });

        await flow.save();

        const deletedTeamHeadId = deleted?.team_head?.toString?.() || "";
        if (deletedTeamHeadId) {
            await notifyProjectAssignmentChange({
                recipientIds: [deletedTeamHeadId],
                actorId: session?.user?.id,
                projectId: deleted?.project_id?.toString?.() || "",
                projectName: project?.project_name || "project",
                role: "team-head",
                event: "removed",
                teamId: deleted?._id?.toString?.() || team_id || "",
                teamName: deleted?.team_name || "",
            });
        }

        const removedMemberIds = Array.from(
            new Set(
                teamMembers
                    .map((member: any) => member?.user_id?.toString?.() ?? String(member?.user_id || ""))
                    .filter((id: string) => id && id !== deletedTeamHeadId)
            )
        );
        if (removedMemberIds.length > 0) {
            await notifyProjectAssignmentChange({
                recipientIds: removedMemberIds,
                actorId: session?.user?.id,
                projectId: deleted?.project_id?.toString?.() || "",
                projectName: project?.project_name || "project",
                role: "team-member",
                event: "removed",
                teamId: deleted?._id?.toString?.() || team_id || "",
                teamName: deleted?.team_name || "",
            });
        }

        return NextResponse.json({message:"Team Deleted Successfully", status: 200}, {status:200});

    }catch(err){
        console.log("error while deleting team: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}
