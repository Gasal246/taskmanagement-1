import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { NextRequest, NextResponse } from "next/server";
import Todos from "@/models/todo.model";
import { resolveSessionUserId } from "@/lib/utils";
import { resolveTodoCloudAccess } from "@/lib/todo-access";

connectDB();

interface Body{
    content: string;
    priority?: "low" | "medium" | "high";
    due_date?: string | null;
}

export async function POST(req: NextRequest){
    try{
        const session:any = await auth();
        if(!session) return NextResponse.json({message:"Un-Authorized Access", status: 401}, {status: 401});
        const userId = resolveSessionUserId(session);
        const access = await resolveTodoCloudAccess(userId);
        if (!access.allowed) return NextResponse.json({message: "Cloud todos are only available to Sales staff", status: 403}, {status: 403});

        const body:Body = await req.json();
        const content = body.content?.trim();
        if (!content) return NextResponse.json({message: "Task name is required", status: 400}, {status: 400});
        if (content.length > 240) return NextResponse.json({message: "Task name is too long", status: 400}, {status: 400});
        const priority = ["low", "medium", "high"].includes(body.priority || "") ? body.priority : "low";
        const dueDate = body.due_date ? new Date(body.due_date) : null;

        const newTodo = new Todos({
            content,
            user_id: userId,
            is_completed: false,
            priority,
            due_date: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
        });

        await newTodo.save();

        return NextResponse.json({message:"Task added", data: newTodo.toObject(), status: 201}, {status: 201});

    }catch(err){
        console.log("Error while adding Todo: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
