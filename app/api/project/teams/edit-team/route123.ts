import connectDB from "@/lib/mongo";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../../auth/[...nextauth]/route";
import Teams from "@/models/teams.model";
import Team_Members from "@/models/team_members.model";
import Project_Teams from "@/models/project_team.model";

connectDB();

interface Body {
    team_id: string,
    team_members: string[],
    team_head: string,
    team_name: string,
    project_id: string
}

export async function PUT(req: NextRequest) {
    try {
        const session: any = await getServerSession(authOptions);
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const body:Body = await req.json();
        if(!body.team_id) return NextResponse.json({message: "no team_id provided"}, {status: 400});

        const teamToEdit:any = await Teams.findByIdAndUpdate(body.team_id,{
            $set:{team_name: body.team_name}
        }, {new: true});

        await Team_Members.deleteMany({team_id: body.team_id});

        const newMembers = body.team_members.map(member=>({
            team_id: body.team_id,
            user_id: member
        }));
        await Team_Members.insertMany(newMembers);

        const teamHead = await Project_Teams.findOneAndUpdate(
            {team_id: body.team_id, project_id: body.project_id},
            {$set: {team_head: body.team_head}},
            {new: true}
        );
        return NextResponse.json({message: "team updated"}, {status:200});
        
    } catch (err) {
        console.log("error while updating team", err);
    }
}