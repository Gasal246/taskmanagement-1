import { auth } from "@/auth";
import { resolveSessionUserId } from "@/lib/utils";
import connectDB from "@/lib/mongo";
import Todos from "@/models/todo.model";
import mongoose from "mongoose";
import { resolveTodoCloudAccess } from "@/lib/todo-access";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req:NextRequest){
    try{
        const session:any = await auth();
        if(!session) return NextResponse.json({message: "Un-Authorized Access", status: 401}, {status: 401});
        const userId = resolveSessionUserId(session);
        const access = await resolveTodoCloudAccess(userId);
        if (!access.allowed) return NextResponse.json({message: "Cloud todos are only available to Sales staff", status: 403}, {status: 403});
        const {searchParams} = new URL(req.url);
        const todo_id = searchParams.get("todo_id");
        if(!todo_id) return NextResponse.json({message: "No todo found", status: 404}, {status: 404});
        if (!mongoose.Types.ObjectId.isValid(todo_id)) return NextResponse.json({message: "Invalid task", status: 400}, {status: 400});

        const todo = await Todos.findOneAndDelete({_id: todo_id, user_id: userId});
        if (!todo) return NextResponse.json({message: "Task not found", status: 404}, {status: 404});

        return NextResponse.json({message: "Task deleted", data: {_id: todo_id}, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while deleting Todo: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500})
    }
}
