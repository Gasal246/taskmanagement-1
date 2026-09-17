import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { resolveTodoCloudAccess } from "@/lib/todo-access";
import { resolveSessionUserId } from "@/lib/utils";
import { NextResponse } from "next/server";

connectDB();

export async function GET() {
  try {
    const session: any = await auth();
    if (!session) return NextResponse.json({ message: "Un-Authorized Access" }, { status: 401 });

    const access = await resolveTodoCloudAccess(resolveSessionUserId(session));
    return NextResponse.json({
      mode: access.allowed ? "cloud" : "local",
      reason: access.reason,
    });
  } catch (error) {
    console.error("Failed to resolve todo storage mode", error);
    return NextResponse.json({ message: "Could not determine todo storage mode" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
