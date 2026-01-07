import connectDB from "@/lib/mongo";
import Project_Teams from "@/models/project_team.model";
import '@/models/project_departments.model';
import '@/models/users.model';
import { NextRequest, NextResponse } from "next/server";
import Project_Team_Members from "@/models/project_team_members.model";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const project_id = searchParams.get("project_id");
        
        const teams = await Project_Teams.find({project_id: project_id})
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
