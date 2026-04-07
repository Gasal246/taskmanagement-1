import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business_Tasks from "@/models/business_tasks.model";
import Calendar_Events from "@/models/calendar_events.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

const ALLOWED_STATUS = new Set(["To Do", "In Progress", "Completed", "Cancelled"]);

const getRoleName = (req: NextRequest) => {
  const roleCookie = req.cookies.get("user_role")?.value || "";
  try {
    const parsed = roleCookie ? JSON.parse(roleCookie) : null;
    return String(parsed?.role_name || parsed?.role || "").toUpperCase();
  } catch (error) {
    return "";
  }
};

export async function PATCH(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized Access" }, { status: 401 });
    }

    const body = await req.json();
    const type = String(body?.type || "");
    const sourceId = String(body?.sourceId || "");
    const status = String(body?.status || "");

    if (!sourceId || !ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ message: "Invalid calendar status payload." }, { status: 400 });
    }

    const roleName = getRoleName(req);
    const isAdmin =
      roleName === "BUSINESS_ADMIN" ||
      roleName === "SUPER_ADMIN" ||
      roleName.includes("ADMIN");

    if (type === "task") {
      const task: any = await Business_Tasks.findById(sourceId).select("assigned_to creator").lean();
      if (!task) {
        return NextResponse.json({ message: "Task not found." }, { status: 404 });
      }

      const canUpdate =
        isAdmin ||
        String(task?.assigned_to || "") === String(session.user.id) ||
        String(task?.creator || "") === String(session.user.id);

      if (!canUpdate) {
        return NextResponse.json({ message: "Unauthorized Access" }, { status: 403 });
      }

      await Business_Tasks.findByIdAndUpdate(sourceId, { $set: { status } });
      return NextResponse.json({ message: "Task status updated." }, { status: 200 });
    }

    if (type === "custom") {
      const event: any = await Calendar_Events.findById(sourceId)
        .select("created_by attendee_ids")
        .lean();

      if (!event) {
        return NextResponse.json({ message: "Calendar task not found." }, { status: 404 });
      }

      const attendeeIds = Array.isArray(event?.attendee_ids) ? event.attendee_ids : [];
      const canUpdate =
        isAdmin ||
        String(event?.created_by || "") === String(session.user.id) ||
        attendeeIds.some((id: any) => String(id) === String(session.user.id));

      if (!canUpdate) {
        return NextResponse.json({ message: "Unauthorized Access" }, { status: 403 });
      }

      await Calendar_Events.findByIdAndUpdate(sourceId, { $set: { status } });
      return NextResponse.json({ message: "Calendar task status updated." }, { status: 200 });
    }

    return NextResponse.json({ message: "Unsupported calendar item type." }, { status: 400 });
  } catch (error) {
    console.log("Error while updating calendar item status", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
