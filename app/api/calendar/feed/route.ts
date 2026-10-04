import { temporaryDatabaseFailureResponse } from "@/lib/auth-availability";
import { canAdministerBusiness } from "@/lib/server-access";
import { getSelectedHeadDirectStaffIds, resolveSelectedHeadContext } from "@/app/api/helpers/head-reassignment-scope";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Calendar_Events from "@/models/calendar_events.model";
import Business_Tasks from "@/models/business_tasks.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Project_Teams from "@/models/project_team.model";
import ProjectTeamMembers from "@/models/project_team_members.model";
import { NextRequest, NextResponse } from "next/server";
import { resolveActiveBusinessIdForUser } from "@/app/api/helpers/resolve-user-business";
import { calendarFeedPage, CalendarQueryError, parseCalendarPage } from "@/lib/calendar/feed-page";

const boolean = (value: string | null) => value === null || !["false", "0", "off", "no"].includes(value.toLowerCase());
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized Access" }, { status: 401 });
    const params = req.nextUrl.searchParams;
    const page = parseCalendarPage(params);
    const start = params.has("start_date") ? new Date(params.get("start_date")!) : new Date(Date.now() - 30 * 86400000);
    const end = params.has("end_date") ? new Date(params.get("end_date")!) : new Date(Date.now() + 30 * 86400000);
    if (!Number.isFinite(+start) || !Number.isFinite(+end) || start > end || +end - +start > 93 * 86400000) throw new CalendarQueryError("Choose a valid calendar range of at most 93 days");
    const search = (params.get("search") || "").trim();
    if (search.length > 100) throw new CalendarQueryError("Search is limited to 100 characters");
    await connectDB();
    const businessId = await resolveActiveBusinessIdForUser(session.user.id);
    if (!businessId) return NextResponse.json({ message: "Business assignment not found." }, { status: 400 });
    const isAdmin = Boolean(session.user.is_super || await canAdministerBusiness(session.user.id, businessId));
    const headContext = !isAdmin ? await resolveSelectedHeadContext(req, session.user.id, businessId) : null;
    const taskQuery: any = { business_id: businessId, start_date: { $ne: null, $lte: end }, end_date: { $ne: null, $gte: start } };
    if (!isAdmin && boolean(params.get("includeTasks"))) {
      const [members, heads, staff] = await Promise.all([
        ProjectTeamMembers.find({ user_id: session.user.id }).select("project_team_id").lean(),
        Project_Teams.find({ team_head: session.user.id }).select("_id").lean(),
        headContext ? getSelectedHeadDirectStaffIds(headContext) : Promise.resolve([]),
      ]);
      const teamIds = [...members.map((row: any) => row.project_team_id), ...heads.map((row: any) => row._id)].filter(Boolean);
      taskQuery.$or = [{ assigned_to: session.user.id }, { creator: session.user.id }, { assigned_teams: { $in: teamIds } }];
      if (staff.length) taskQuery.$or.push({ assigned_to: { $in: staff } }, { creator: { $in: staff } });
    }
    const eventQuery = { business_id: businessId, start_date: { $lte: end }, end_date: { $gte: start }, $or: [{ created_by: session.user.id }, { attendee_ids: session.user.id }] };
    const result = await calendarFeedPage({ taskQuery, eventQuery, userId: session.user.id, start, end, search, page,
      includeTasks: boolean(params.get("includeTasks")), includeEnquiries: boolean(params.get("includeEnquiries")), includeCustomEvents: boolean(params.get("includeCustomEvents")),
    });
    // Population is bounded to this page; search and counts were computed over the full scope.
    const [tasks, enquiries, events] = await Promise.all([
      Business_Tasks.populate(result.entries.filter((row: any) => row._kind === "task"), [{ path: "assigned_to", select: "name" }, { path: "creator", select: "name" }, { path: "assigned_teams", select: "team_name" }]),
      Eq_enquiry_histories.populate(result.entries.filter((row: any) => ["enquiry", "legacy"].includes(row._kind)), [{ path: "enquiry_id", select: "enquiry_uuid status next_action" }, { path: "assigned_to", select: "name" }, { path: "forwarded_by", select: "name" }]),
      Calendar_Events.populate(result.entries.filter((row: any) => row._kind === "custom"), [{ path: "created_by", select: "name" }, { path: "attendee_ids", select: "name" }]),
    ]);
    const label = (rows: any, field: string) => (Array.isArray(rows) ? rows : rows ? [rows] : []).map((row: any) => row?.[field]).filter(Boolean).join(", ");
    const items = [...tasks, ...enquiries, ...events].map((row: any) => {
      const common = { id: row._key, type: ["legacy", "enquiry"].includes(row._kind) ? "enquiry" : row._kind, start: row._start?.toISOString() || null, end: row._end?.toISOString() || null };
      if (row._kind === "task") return { ...common, sourceId: String(row._id), title: row.task_name || "Untitled task", description: row.task_description || "", status: row.status || "", assignedLabel: row.assigned_to?.name || label(row.assigned_teams, "team_name") || "Unassigned", createdBy: row.creator?.name || "", isProjectTask: Boolean(row.is_project_task) };
      if (row._kind === "custom") return { ...common, sourceId: String(row._id), title: row.title || "Untitled event", description: row.description || "", status: row.status || "To Do", assignedLabel: label(row.attendee_ids, "name"), createdBy: row.created_by?.name || "" };
      return { ...common, sourceId: String(row.enquiry_id?._id || row.enquiry_id || ""), historyId: String(row._id), title: `Enquiry Action: ${row.action || "Not Specified"}`, description: row.enquiry_id?.next_action || row.feedback || "", action: row.action || "", priority: row.priority ?? null, enquiryUuid: row.enquiry_id?.enquiry_uuid || "", status: row.enquiry_id?.status || "", assignedLabel: label(row.assigned_to, "name"), createdBy: row.forwarded_by?.name || "" };
    }).sort((a: any, b: any) => (a.start || "").localeCompare(b.start || "") || a.id.localeCompare(b.id));
    return NextResponse.json({ items, summary: result.summary, pagination: result.pagination, scope: isAdmin ? "admin" : "staff" });
  } catch (error) {
    const unavailable = temporaryDatabaseFailureResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof CalendarQueryError) return NextResponse.json({ message: error.message }, { status: 400 });
    console.error("Calendar feed loading failed");
    return NextResponse.json({ message: "Unable to load the calendar. Please try again." }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
