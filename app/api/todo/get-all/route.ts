import connectDB from "@/lib/mongo";
import { message } from "antd";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import Todos from "@/models/todo.model";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session:any = await getServerSession(authOptions);
        if(!session) return NextResponse.json({message: "Un-Authorized Access", status: 401}, {status: 401});
        console.log("user_id: ", session?.user?.id);
        
        const todos = await Todos.find({user_id: session?.user?.id}).lean();
        console.log("todos: ", todos);
        
        return NextResponse.json({data: todos, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while getting all Todos: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500});
    }
}