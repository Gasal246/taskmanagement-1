import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { NextRequest, NextResponse } from "next/server";
import Todos from "@/models/todo.model";
import { resolveSessionUserId } from "@/lib/utils";
import { resolveTodoCloudAccess } from "@/lib/todo-access";

connectDB();

export async function GET(_req:NextRequest){
    try{
        const session:any = await auth();
        if(!session) return NextResponse.json({message: "Un-Authorized Access", status: 401}, {status: 401});
        const userId = resolveSessionUserId(session);
        const access = await resolveTodoCloudAccess(userId);
        if (!access.allowed) return NextResponse.json({message: "Cloud todos are only available to Sales staff", status: 403}, {status: 403});
        const todos = await Todos.find({user_id: userId}).sort({createdAt: -1}).lean();
        
        return NextResponse.json({data: todos, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while getting all Todos: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500});
    }
}
