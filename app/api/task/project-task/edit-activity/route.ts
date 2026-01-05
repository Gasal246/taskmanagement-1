import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Task_Activities from "@/models/task_activities.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    activity_id: string,
    is_done: boolean,
    activity: string | null,
    description: string | null,
    is_status: boolean
}

export async function PUT(req: NextRequest) {
    try {

        const session: any = await auth();
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const body: Body = await req.json();
        if (!body.activity_id) return NextResponse.json({ message: "Please Provide Activity_id" }, { status: 400 });

        if (body.is_status) {
            const changeStatus = await Task_Activities.findByIdAndUpdate(body.activity_id, {
                $set: { is_done: body.is_done }
            }, { new: true });

            if (body.is_done) {
                const completedTime = new Date().getTime() -  changeStatus.createdAt.getTime();
                console.log("completedTime", completedTime);
                
                await Task_Activities.findByIdAndUpdate(changeStatus._id, {
                    $set: {completed_in: completedTime}
                })
                const updatedActivity = await Business_Tasks.findByIdAndUpdate(changeStatus.task_id, {
                    $inc: { completed_activity: 1 },
                },{new:true})


                if(updatedActivity.activity_count == updatedActivity.completed_activity){
                    await Business_Tasks.findByIdAndUpdate(updatedActivity._id, {
                        $set: {status: "Completed"}
                    })
                    if(updatedActivity.is_project_task){
                        const newFLow = new Flow_Log({
                            user_id: session?.user?.id,
                            Log: `${updatedActivity.task_name} Task has been marked as Completed`,
                            task_id: updatedActivity._id,
                            project_id: updatedActivity.project_id || "",
                            description: "Task Marked as complete"
                        })
                        await newFLow.save();
                    }
                }
            }
            return NextResponse.json({ message: "Activity marked as completed", status: 200 }, { status: 200 });
        } else {
            const updateActivity = await Task_Activities.findByIdAndUpdate(body.activity_id, {
                $set: { activity: body.activity, description: body.description }
            });

            return NextResponse.json({ message: "Activity Updated", status: 200 }, { status: 200 });
        }
    } catch (err) {
        console.log("error while updating task activity", err);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });

    }
}