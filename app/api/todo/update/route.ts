import { auth } from "@/auth";
import { resolveSessionUserId } from "@/lib/utils";
import connectDB from "@/lib/mongo";
import Todos from "@/models/todo.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { resolveTodoCloudAccess } from "@/lib/todo-access";

connectDB();

type UpdateBody = {
  todo_id: string;
  content?: string;
  priority?: "low" | "medium" | "high";
  due_date?: string | null;
};

export async function PATCH(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) return NextResponse.json({ message: "Un-Authorized Access", status: 401 }, { status: 401 });
    const userId = resolveSessionUserId(session);
    const access = await resolveTodoCloudAccess(userId);
    if (!access.allowed) return NextResponse.json({message: "Cloud todos are only available to Sales staff", status: 403}, {status: 403});

    const body: UpdateBody = await req.json();
    if (!mongoose.Types.ObjectId.isValid(body.todo_id)) {
      return NextResponse.json({ message: "Invalid task", status: 400 }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.content !== undefined) {
      const content = body.content.trim();
      if (!content || content.length > 240) {
        return NextResponse.json({ message: "Task name must be between 1 and 240 characters", status: 400 }, { status: 400 });
      }
      updates.content = content;
    }
    if (body.priority !== undefined) {
      if (!["low", "medium", "high"].includes(body.priority)) {
        return NextResponse.json({ message: "Invalid priority", status: 400 }, { status: 400 });
      }
      updates.priority = body.priority;
    }
    if (body.due_date !== undefined) {
      const dueDate = body.due_date ? new Date(body.due_date) : null;
      if (dueDate && Number.isNaN(dueDate.getTime())) {
        return NextResponse.json({ message: "Invalid due date", status: 400 }, { status: 400 });
      }
      updates.due_date = dueDate;
    }

    const todo = await Todos.findOneAndUpdate(
      { _id: body.todo_id, user_id: userId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!todo) return NextResponse.json({ message: "Task not found", status: 404 }, { status: 404 });

    return NextResponse.json({ message: "Task updated", data: todo.toObject(), status: 200 }, { status: 200 });
  } catch (err) {
    console.log("Error while updating Todo: ", err);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
