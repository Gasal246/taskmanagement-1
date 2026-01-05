import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body{
    project_id: string | null,
    assigned_to: string | null,
    task_name:string,
    task_description: string,
    start_date: Date,
    end_date: Date,
    status: string,
    business_id: string,
    is_project_task: boolean
}

export async function POST(req:NextRequest){
    try{
        const session: any = await auth();
        if(!session) return new NextResponse("Un Authorized Access", { status: 401 });
        
        const user = await Users.findById(session?.user?.id).select("name");

        const body:Body = await req.json();

        if(!body.assigned_to){
            body.assigned_to = null;
        }

        const newTask = new Business_Tasks({
            project_id: body.project_id,
            is_project_task: body.is_project_task,
            creator: session?.user?.id,
            task_name: body.task_name,
            task_description: body.task_description,
            start_date: body.start_date,
            end_date: body.end_date,
            status: body.status,
            activity_count: 0,
            completed_activity: 0,
            business_id: body.business_id
        });
        {body.is_project_task ? newTask.assigned_teams = body.assigned_to : newTask.assigned_to = body.assigned_to}
        const Task = await newTask.save();
        if(body.is_project_task){
            const taskFLow = new Flow_Log({
                Log: `${body.task_name} Task Added by ${user.name}`,
                project_id: body?.project_id || "",
                task_id: Task._id,
                descrption: "New Task Added",
                user_id: session?.user?.id
            });
            await taskFLow.save();
        }

        return NextResponse.json({message:"Task Created", data:Task}, {status: 201});
    }catch(err){
        console.log("error while adding new Task", err);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
        
    }
}