import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Calendar_Events from "@/models/calendar_events.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { resolveActiveBusinessIdForUser } from "@/app/api/helpers/resolve-user-business";
import { notifyCalendarEventRecipients } from "@/app/api/helpers/calendar-notifications";
import { HEAD_ROLES } from "@/lib/constants";

connectDB();

type Body = {
  title: string;
  description?: string;
  start_date: string | Date;
  end_date: string | Date;
  attendee_ids?: string[];
  status?: string;
};

const getRoleName = (req: NextRequest) => {
  const roleCookie = req.cookies.get("user_role")?.value || "";
  try {
    const parsed = roleCookie ? JSON.parse(roleCookie) : null;
    return String(parsed?.role_name || parsed?.role || "").toUpperCase();
  } catch (error) {
    return "";
  }
};

const toIsoDate = (value: string | Date | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

export async function POST(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized Access" }, { status: 401 });
    }

    const body: Body = await req.json();
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const status = String(body?.status || "To Do").trim();
    const startDate = toIsoDate(body?.start_date);
    const endDate = toIsoDate(body?.end_date);

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { message: "Title, start date and end date are required." },
        { status: 400 }
      );
    }

    if (endDate.getTime() < startDate.getTime()) {
      return NextResponse.json(
        { message: "End date must be after start date." },
        { status: 400 }
      );
    }

    const businessId = await resolveActiveBusinessIdForUser(session?.user?.id);
    if (!businessId) {
      return NextResponse.json(
        { message: "Business assignment not found." },
        { status: 400 }
      );
    }

    const roleName = getRoleName(req);
    const isAdmin =
      roleName === "BUSINESS_ADMIN" ||
      roleName === "SUPER_ADMIN" ||
      roleName.includes("ADMIN");
    const canAssignStaff = isAdmin || HEAD_ROLES.includes(roleName);

    const rawAttendees = Array.isArray(body?.attendee_ids) ? body.attendee_ids : [];
    const uniqueAttendees = Array.from(
      new Set(
        rawAttendees
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      )
    );

    const attendeeIds = canAssignStaff
      ? Array.from(new Set([...uniqueAttendees, String(session.user.id)]))
      : [String(session.user.id)];
    const sender = await Users.findById(session.user.id).select("name").lean<{ name?: string }>();

    const newEvent = await Calendar_Events.create({
      business_id: businessId,
      created_by: session.user.id,
      attendee_ids: attendeeIds,
      title,
      description,
      status,
      start_date: startDate,
      end_date: endDate,
    });

    if (canAssignStaff && attendeeIds.length > 0) {
      await notifyCalendarEventRecipients({
        recipientIds: attendeeIds,
        senderId: String(session.user.id),
        senderName: sender?.name || "Admin",
        eventId: String(newEvent._id),
        eventTitle: title,
        description,
        startDate,
        endDate,
      });
    }

    const populatedEvent = await Calendar_Events.findById(newEvent._id)
      .populate({ path: "created_by", select: "name avatar_url" })
      .populate({ path: "attendee_ids", select: "name avatar_url" })
      .lean();

    return NextResponse.json(
      { message: "Calendar event created.", data: populatedEvent },
      { status: 201 }
    );
  } catch (error) {
    console.log("Error while creating calendar event", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
