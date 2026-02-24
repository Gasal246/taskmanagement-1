import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { notifyTaskActivityChange } from "@/app/api/helpers/task-activity-notifications";

connectDB();

export async function DELETE(req:NextRequest){
    try{
        const session: any = await auth();
        if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

        const actor = await Users.findById(session?.user?.id).select("name");

        const {searchParams} = new URL(req.url);
        const activity_id = searchParams.get("activity_id");
        if(!activity_id) return NextResponse.json({message: "Please Provide activity_id"}, {status:400});

        const activityToDelete = await Task_Activities.findById(activity_id);
        if (!activityToDelete) {
            return NextResponse.json({message: "Activity not found"}, {status:404});
        }

        await Task_Activities.findByIdAndDelete(activity_id);

        if(activityToDelete.is_done){
            const afterDel = await Business_Tasks.findByIdAndUpdate(activityToDelete.task_id, {
                $inc: {activity_count: -1, completed_activity: -1}
            },{new:true})
            if(afterDel.activity_count == afterDel.completed_activity) await Business_Tasks.findByIdAndUpdate(afterDel._id, {$set:{status:"Completed"}})
        } else {
            const afterDel = await Business_Tasks.findByIdAndUpdate(activityToDelete.task_id, {
                $inc: {activity_count: -1}
            }, {new:true})
            if(afterDel.activity_count == afterDel.completed_activity) await Business_Tasks.findByIdAndUpdate(afterDel._id, {$set:{status:"Completed"}})
        }


        const taskId = activityToDelete?.task_id?.toString();
        if (actor?._id && taskId) {
            await notifyTaskActivityChange({
                req,
                taskId,
                activityId: activityToDelete?._id?.toString(),
                activityTitle: activityToDelete?.activity || "",
                activityDescription: activityToDelete?.description || "",
                activityAssignedTo: activityToDelete?.assigned_to?.toString() || null,
                action: "removed",
                actorId: String(actor._id),
                actorName: actor?.name || "User",
            });
        }

        return NextResponse.json({message: "Activity Deleted Successfully"}, {status: 203})
    }catch(err){
        console.log("error while deleting activity", err);
        return NextResponse.json({message:"Internal Server Error"}, {status:500});
    }
}
