import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Project_Teams from "@/models/project_team.model";
import '@/models/project_departments.model';
import '@/models/users.model';
import { NextRequest, NextResponse } from "next/server";
import Project_Team_Members from "@/models/project_team_members.model";
import User_roles from "@/models/user_roles.model";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session: any = await auth();
        if(!session) return NextResponse.json({message: "Un Authorized Access", status: 401}, { status: 401 });

        const {searchParams} = new URL(req.url);
        const project_id = searchParams.get("project_id");
        const roleRow: any = await User_roles.findOne({ user_id: session?.user?.id, status: 1 })
            .populate({ path: "role_id", select: { role_name: 1 } })
            .lean();
        const roleName = roleRow?.role_id?.role_name || "";
        const isAdminLike =
            roleName === "BUSINESS_ADMIN" ||
            roleName === "SUPER_ADMIN" ||
            String(roleName).toUpperCase().includes("ADMIN");

        let teamQuery: any = { project_id: project_id };
        if (!isAdminLike) {
            const project = await Business_Project.findById(project_id)
                .select("project_head project_heads")
                .lean();
            const projectHeadIds = Array.from(
                new Set(
                    [
                        ...(Array.isArray((project as any)?.project_heads) ? (project as any).project_heads : []),
                        (project as any)?.project_head,
                    ]
                        .filter(Boolean)
                        .map((id: any) => id?.toString?.() ?? String(id))
                )
            );
            const isProjectHead = projectHeadIds.includes(String(session?.user?.id));

            if (!isProjectHead) {
                const memberships = await Project_Team_Members.find({ user_id: session?.user?.id })
                    .select("project_team_id")
                    .lean();
                const memberTeamIds = memberships
                    .map((row: any) => row?.project_team_id)
                    .filter(Boolean);

                teamQuery = {
                    project_id: project_id,
                    $or: [
                        { team_head: session?.user?.id },
                        { _id: { $in: memberTeamIds } },
                    ],
                };
            }
        }

        const teams = await Project_Teams.find(teamQuery)
            .populate('team_head', 'name email avatar_url')
            .populate("project_dept_id", "department_name")
            .lean();
        
        for (const team of teams){
            const member = await Project_Team_Members.find({ project_team_id: team._id })
                .populate("user_id", "name email avatar_url")
                .lean();
            team.members = member;
        }
        
        return NextResponse.json({ data: teams, status: 200}, {status: 200})
    }catch(err){
        console.log("error while getting teams get-by-project", err);
        return NextResponse.json({message: "Internal Server Error"}, {status: 500})
        
    }
}
