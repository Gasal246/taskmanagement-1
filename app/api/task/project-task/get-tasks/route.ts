import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import { NextRequest, NextResponse } from "next/server";
import '@/models/project_team.model';

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const project_id = searchParams.get("project_id");  
        if(!project_id) return NextResponse.json({message: "Please provide Project_id"}, {status:500});

        const task = await Business_Tasks.find({project_id:project_id}).populate("assigned_teams","team_name");
        console.log("tasks", task);
        
        if(task.length > 0) return NextResponse.json({data: task}, {status:200});
        return NextResponse.json({message:"No Tasks to Show"}, {status: 203});
    }catch(err){
        console.log("error while getting task", err);
        return NextResponse.json({message:"Internal Server Error"}, {status:500})  
    }
}