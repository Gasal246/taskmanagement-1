import connectDB from "@/lib/mongo";
import Todos from "@/models/todo.model";
import { message } from "antd";
import { ObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    todo_id: string,
}

export async function PUT(req: NextRequest) {
    try {
        const body: Body = await req.json();

        await Todos.findByIdAndUpdate(body.todo_id, [
            { $set: { is_completed: { $not: "$is_completed" } } },
        ]);

        return NextResponse.json({ message: "Todo updated", status: 200 }, { status: 200 });

    } catch (err) {
        console.log("Error while updating Todo: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}