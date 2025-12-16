import connectDB from "@/lib/mongo";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import Todos from "@/models/todo.model";

connectDB();

interface Body{
    content: string
}

export async function POST(req: NextRequest){
    try{
        const session:any = await getServerSession(authOptions);
        if(!session) return NextResponse.json({message:"Un-Authorized Access", status: 401}, {status: 401});

        const body:Body = await req.json();

        const newTodo = new Todos({
            content: body.content,
            user_id: session?.user?.id,
            is_completed: false
        });

        await newTodo.save();

        return NextResponse.json({message:"Todo Saved", status: 201}, {status: 201});

    }catch(err){
        console.log("Error while adding Todo: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}