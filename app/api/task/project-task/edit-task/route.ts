import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body{
    task_name: string,
    task_description: string,
    assigned_to: string,
    start_date: Date,
    end_date: Date,
    status: string,
    task_id: string,
    is_project_task: boolean
}

export async function PUT(req:NextRequest){
    try{
        const body:Body = await req.json();
        if(!body.task_id) return NextResponse.json({message: "Please provide task_id"}, {status:400});
        if(body.is_project_task){
            const taskToEdit = await Business_Tasks.findByIdAndUpdate(body.task_id,{
                $set:{
                    task_name: body.task_name,
                    task_description: body.task_description,
                    assigned_teams: body.assigned_to,
                    start_date: body.start_date,
                    end_date: body.end_date,
                    status: body.status
                }
            }, {new: true})
    
            return NextResponse.json({message:"Task Updated Successfully"}, {status: 200});
        } else {
            const taskToEdit = await Business_Tasks.findByIdAndUpdate(body.task_id,{
                $set:{
                    task_name: body.task_name,
                    task_description: body.task_description,
                    assigned_to: body.assigned_to,
                    start_date: body.start_date,
                    end_date: body.end_date,
                    status: body.status
                }
            }, {new: true})
    
            return NextResponse.json({message:"Task Updated Successfully"}, {status: 200});
        }

    }catch(err){
        console.log("error while updating task", err);
        return NextResponse.json({message: "Internal Server Error"}, {status:500});
    }
}