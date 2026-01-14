import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
import { message } from "antd";
import { Activity } from "lucide-react";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    task_id: string,
    project_id: string | null,
    activity: string,
    description: string,
    assigned_to?: string | null,
    assigned_skill?: string | null,
};

export async function POST(req: NextRequest) {
    try {
        const body: Body = await req.json();
        if (!body.task_id) return NextResponse.json({ message: "Please provide task_id" }, { status: 400 });

        const task = await Business_Tasks.findById(body.task_id)
            .select("assigned_to is_project_task project_id")
            .lean();
        if (!task) {
            return NextResponse.json({ message: "Task not found" }, { status: 404 });
        }

        const assignedTo = body.assigned_to || (!task.is_project_task ? task.assigned_to : null);
        const projectId = body.project_id ?? task.project_id ?? null;

        const newActivity = new Task_Activities({
            task_id: body.task_id,
            project_id: projectId,
            activity: body.activity,
            description: body.description,
            is_done: false,
            assigned_to: assignedTo || null,
            assigned_skill: body.assigned_skill || null
        });
        const savedActivity = await newActivity.save();

        const updatedTask = await Business_Tasks.findByIdAndUpdate(body.task_id, {
            $inc:{activity_count: 1}
        }, {new:true});

        if(updatedTask.status == "Completed") await Business_Tasks.findByIdAndUpdate(body.task_id, {$set:{status:"In Progress"}})
        
        return NextResponse.json({ message: "Activity Added Successfully" }, { status: 201 });

    } catch (err) {
        console.log("error while adding activity", err);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
