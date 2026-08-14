import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageProjectTaskActivities } from "@/app/api/helpers/project-task-teams";

connectDB();

interface Body{
    task_name: string,
    task_description: string,
    priority?: "high" | "medium" | "normal",
    assigned_to: string,
    start_date: Date,
    end_date: Date,
    status: string,
    task_id: string,
    is_project_task: boolean
}

export async function PUT(req:NextRequest){
    try{
        const session: any = await auth();
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        const body:Body = await req.json();
        if(!body.task_id) return NextResponse.json({message: "Please provide task_id"}, {status:400});
        const existingTask: any = await Business_Tasks.findById(body.task_id)
            .select("business_id project_id creator is_project_task assigned_teams")
            .lean();
        if (!existingTask) return NextResponse.json({ message: "Task not found" }, { status: 404 });
        const updates: Record<string, unknown> = {
            task_name: body.task_name,
            task_description: body.task_description,
        };
        if (["high", "medium", "normal"].includes(String(body.priority || ""))) {
            updates.priority = body.priority;
        }
        if (body.start_date) updates.start_date = body.start_date;
        if (body.end_date) updates.end_date = body.end_date;
        if(existingTask.is_project_task){
            if (!(await canManageProjectTaskActivities(existingTask, String(session.user.id)))) {
                return NextResponse.json({ message: "You cannot edit this project task" }, { status: 403 });
            }
            const taskToEdit = await Business_Tasks.findByIdAndUpdate(body.task_id,{
                $set: updates
            }, {new: true})
    
            return NextResponse.json({message:"Task Updated Successfully"}, {status: 200});
        } else {
            if (Object.prototype.hasOwnProperty.call(body, "assigned_to")) {
                updates.assigned_to = body.assigned_to;
            }
            const taskToEdit = await Business_Tasks.findByIdAndUpdate(body.task_id,{
                $set: updates
            }, {new: true})
    
            return NextResponse.json({message:"Task Updated Successfully"}, {status: 200});
        }

    }catch(err){
        console.log("error while updating task", err);
        return NextResponse.json({message: "Internal Server Error"}, {status:500});
    }
}
