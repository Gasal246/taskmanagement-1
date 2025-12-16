import connectDB from "@/lib/mongo";
import Todos from "@/models/todo.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const todo_id = searchParams.get("todo_id");
        if(!todo_id) return NextResponse.json({message: "No todo found", status: 404}, {status: 404});

        await Todos.findByIdAndDelete(todo_id);

        return NextResponse.json({message: "Todo Deleted", status: 200}, {status: 200});

    }catch(err){
        console.log("Error while deleting Todo: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500})
    }
}