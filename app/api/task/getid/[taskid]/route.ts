import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
import { NextRequest, NextResponse } from "next/server";
import Users from "@/models/users.model";
import Business_Project from "@/models/business_project.model";
import Project_Teams from "@/models/project_team.model";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

connectDB();

export async function GET(req:NextRequest, {params}: {params: {taskid:string}}){
    try{
        const {taskid} = params;
        
        let task = await Business_Tasks.findById(taskid);
        if(task){
            const taskObj = task.toObject();
            const activities = await Task_Activities.find({task_id: taskid});
            if(activities.length > 0) taskObj.activities = activities;
            if(task.is_project_task){
                const assigned_teams = await Project_Teams.findById(task.assigned_teams).select("team_name");
                const project_details = await Business_Project.findById(task.project_id).select("project_name");
                taskObj.assigned_team = assigned_teams;
                taskObj.project_details = project_details;
            } else {
                const assigned_user= await Users.findById(task.assigned_to).select("name");
                taskObj.assigned_user = assigned_user;
            }
            console.log("task: ",taskObj );
            
            return NextResponse.json({data: taskObj}, {status:200});
        } else {
            return NextResponse.json({message: "No Content"}, {status:203});
        }
    }catch(err){
        console.log("error while getting task by id", err);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}