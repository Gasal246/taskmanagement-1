import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Calendar_Events from "@/models/calendar_events.model";
import Users from "@/models/users.model";
import Staff from "@/models/business_staffs.model";
import Admins from "@/models/admin_assign_business.model";
import Business from "@/models/business.model";
import { NextRequest, NextResponse } from "next/server";
import { resolveActiveBusinessIdForUser } from "@/app/api/helpers/resolve-user-business";
import { notifyCalendarEventRecipients } from "@/app/api/helpers/calendar-notifications";
import { getSelectedHeadDirectStaffIds, resolveSelectedHeadContext } from "@/app/api/helpers/head-reassignment-scope";
import { inTransaction } from "@/lib/jobs/transaction";
import mongoose from "mongoose";
import { z } from "zod";

const dateSchema = z.string().datetime({ offset: true }).pipe(z.coerce.date());
const bodySchema = z.object({
  title: z.string().trim().min(1).max(200), description: z.string().trim().max(5000).optional().default(""),
  start_date: dateSchema, end_date: dateSchema,
  attendee_ids: z.array(z.string().refine(value => mongoose.Types.ObjectId.isValid(value), "Invalid attendee ID")).max(100).optional().default([]),
  status: z.enum(["To Do", "In Progress", "Completed", "Cancelled"]).optional().default("To Do"),
}).refine(body => body.end_date >= body.start_date, { message: "End date must be after start date", path: ["end_date"] });
class InvitationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized Access" }, { status: 401 });
    await connectDB();
    const userId = session.user.id;
    const businessId = await resolveActiveBusinessIdForUser(userId);
    if (!businessId) return NextResponse.json({ message: "Business assignment not found" }, { status: 400 });
    const attendeeIds = [...new Set([...parsed.data.attendee_ids, userId])];
    const otherIds = attendeeIds.filter(id => id !== userId);
    // Cookie labels are a selection hint, never a grant to invite other users.
    const admin = await Admins.exists({ user_id: userId, business_id: businessId, status: 1 });
    if (otherIds.length && !admin && !session.user.is_super) {
      const context = await resolveSelectedHeadContext(req, userId, businessId);
      const directStaff = context ? await getSelectedHeadDirectStaffIds(context) : [];
      if (!context || otherIds.some(id => !directStaff.includes(id))) {
        return NextResponse.json({ message: "You may invite only staff in your assigned scope" }, { status: 403 });
      }
    }
    const newEvent = await inTransaction(async dbSession => {
      const activeBusiness = await Business.exists({ _id: businessId, status: 1 }).session(dbSession);
      const users = await Users.find({ _id: { $in: attendeeIds }, status: 1 }).select("_id name").session(dbSession).lean();
      const staff = await Staff.find({ user_id: { $in: attendeeIds }, business_id: businessId, status: 1 }).select("user_id").session(dbSession).lean();
      const admins = await Admins.find({ user_id: { $in: attendeeIds }, business_id: businessId, status: 1 }).select("user_id").session(dbSession).lean();
      const members = new Set([...staff, ...admins].map((row: any) => String(row.user_id)));
      if (!activeBusiness || users.length !== attendeeIds.length || attendeeIds.some(id => !members.has(id))) {
        throw new InvitationError(400, "Every attendee must be an active member of this business");
      }
      const [event] = await Calendar_Events.create([{
        ...parsed.data, business_id: businessId, created_by: userId, attendee_ids: attendeeIds,
      }], { session: dbSession });
      await notifyCalendarEventRecipients({ recipientIds: attendeeIds, senderId: userId,
        senderName: users.find((user: any) => String(user._id) === userId)?.name || "User",
        eventId: String(event._id), eventTitle: parsed.data.title, description: parsed.data.description,
        startDate: parsed.data.start_date, endDate: parsed.data.end_date, dbSession,
      });
      return event;
    });
    const populatedEvent = await Calendar_Events.findById(newEvent._id)
      .populate({ path: "created_by", select: "name avatar_url" })
      .populate({ path: "attendee_ids", select: "name avatar_url" }).lean();
    return NextResponse.json({ message: "Calendar event created.", data: populatedEvent }, { status: 201 });
  } catch (error) {
    if (error instanceof InvitationError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error("Calendar event creation failed");
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
