import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { resolveTodoCloudAccess } from "@/lib/todo-access";
import { resolveSessionUserId } from "@/lib/utils";
import Todos from "@/models/todo.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

type ImportTodo = {
  _id: string;
  content: string;
  is_completed: boolean;
  priority?: "low" | "medium" | "high";
  due_date?: string | null;
  createdAt?: string;
};

export async function POST(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) return NextResponse.json({ message: "Un-Authorized Access", status: 401 }, { status: 401 });

    const userId = resolveSessionUserId(session);
    const access = await resolveTodoCloudAccess(userId);
    if (!access.allowed) return NextResponse.json({ message: "Cloud todos are only available to Sales staff", status: 403 }, { status: 403 });

    const body = await req.json();
    const items: ImportTodo[] = Array.isArray(body?.todos) ? body.todos.slice(0, 500) : [];
    if (!items.length) return NextResponse.json({ message: "No local todos to import", status: 400 }, { status: 400 });

    const validItems = items.filter((item) => {
      const createdAt = item.createdAt ? new Date(item.createdAt) : new Date();
      const dueDate = item.due_date ? new Date(item.due_date) : null;
      return Boolean(
        item?._id &&
          typeof item._id === "string" &&
          item._id.length <= 100 &&
          item.content?.trim() &&
          item.content.trim().length <= 240 &&
          !Number.isNaN(createdAt.getTime()) &&
          (!dueDate || !Number.isNaN(dueDate.getTime()))
      );
    });
    if (!validItems.length) return NextResponse.json({ message: "No valid local todos to import", status: 400 }, { status: 400 });

    await Todos.bulkWrite(
      validItems.map((item) => ({
        updateOne: {
          filter: { user_id: userId, client_id: item._id },
          update: {
            $setOnInsert: {
              user_id: userId,
              client_id: item._id,
              content: item.content.trim(),
              is_completed: Boolean(item.is_completed),
              priority: ["low", "medium", "high"].includes(item.priority || "") ? item.priority : "low",
              due_date: item.due_date ? new Date(item.due_date) : null,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );

    const todos = await Todos.find({ user_id: userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ message: `${validItems.length} local todos imported`, data: todos, status: 200 });
  } catch (error) {
    console.error("Failed to import local todos", error);
    return NextResponse.json({ message: "Could not import local todos", status: 500 }, { status: 500 });
  }
}
