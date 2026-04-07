import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Calendar_Events from "@/models/calendar_events.model";
import Business_Tasks from "@/models/business_tasks.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Project_Teams from "@/models/project_team.model";
import Team_Members from "@/models/team_members.model";
import Region_staffs from "@/models/region_staffs.model";
import Area_staffs from "@/models/area_staffs.model";
import Location_staffs from "@/models/location_staffs.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import "@/models/eq_enquiries.model";
import "@/models/eq_camps.model";
import "@/models/eq_camp_headoffice.model";
import { NextRequest, NextResponse } from "next/server";
import { resolveActiveBusinessIdForUser } from "@/app/api/helpers/resolve-user-business";
import { HEAD_ROLES } from "@/lib/constants";
import mongoose from "mongoose";

connectDB();

const parseBooleanParam = (value: string | null, fallback = true) => {
  if (value === null) return fallback;
  return !["false", "0", "off", "no"].includes(String(value).toLowerCase());
};

const parseDateParam = (value: string | null) => {
  if (!value || value === "undefined" || value === "null") return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
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

const normalizeDateRange = (startDate: Date | null, endDate: Date | null) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);

  return { start, end };
};

const resolveBounds = (
  startValue: Date | string | null | undefined,
  endValue: Date | string | null | undefined
) => {
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  const safeStart = start && !Number.isNaN(start.valueOf()) ? start : null;
  const safeEnd = end && !Number.isNaN(end.valueOf()) ? end : null;

  if (safeStart && safeEnd) return { start: safeStart, end: safeEnd };
  if (safeStart) return { start: safeStart, end: safeStart };
  if (safeEnd) return { start: safeEnd, end: safeEnd };
  return { start: null, end: null };
};

const isWithinRange = (
  itemStart: Date | string | null | undefined,
  itemEnd: Date | string | null | undefined,
  filterStart: Date | null,
  filterEnd: Date | null
) => {
  if (!filterStart && !filterEnd) return true;

  const { start, end } = resolveBounds(itemStart, itemEnd);
  if (!start && !end) return false;

  const effectiveStart = start || end;
  const effectiveEnd = end || start;

  if (filterStart && effectiveEnd && effectiveEnd.getTime() < filterStart.getTime()) {
    return false;
  }
  if (filterEnd && effectiveStart && effectiveStart.getTime() > filterEnd.getTime()) {
    return false;
  }

  return true;
};

const toIsoString = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
};

const getDomainId = (req: NextRequest, roleName: string) => {
  const domainCookie = req.cookies.get("user_domain")?.value || "";
  let domainData: any = null;
  try {
    domainData = domainCookie ? JSON.parse(domainCookie) : null;
  } catch (error) {
    domainData = null;
  }

  switch (roleName) {
    case "REGION_HEAD":
    case "REGION_STAFF":
      return domainData?.region_id || domainData?.value || domainData?._id || "";
    case "AREA_HEAD":
    case "AREA_STAFF":
      return domainData?.area_id || domainData?.value || domainData?._id || "";
    case "LOCATION_HEAD":
    case "LOCATION_STAFF":
      return domainData?.location_id || domainData?.value || domainData?._id || "";
    case "REGION_DEP_HEAD":
    case "REGION_DEP_STAFF":
    case "AREA_DEP_HEAD":
    case "AREA_DEP_STAFF":
    case "LOCATION_DEP_HEAD":
    case "LOCATION_DEP_STAFF":
      return domainData?.department_id || domainData?.value || domainData?._id || "";
    default:
      return domainData?.value || domainData?._id || "";
  }
};

const getHeadStaffUserIds = async (roleName: string, domainId: string) => {
  if (!HEAD_ROLES.includes(roleName) || !domainId) return [];

  const roleConfig: Record<string, {
    model: any;
    domainField: string;
    userField: "staff_id" | "user_id";
  }> = {
    REGION_HEAD: { model: Region_staffs, domainField: "region_id", userField: "staff_id" },
    REGION_DEP_HEAD: { model: Region_dep_staffs, domainField: "region_dep_id", userField: "user_id" },
    AREA_HEAD: { model: Area_staffs, domainField: "area_id", userField: "staff_id" },
    AREA_DEP_HEAD: { model: Area_dep_staffs, domainField: "area_dep_id", userField: "user_id" },
    LOCATION_HEAD: { model: Location_staffs, domainField: "location_id", userField: "user_id" },
    LOCATION_DEP_HEAD: { model: Location_dep_staffs, domainField: "location_dep_id", userField: "user_id" },
  };

  const config = roleConfig[roleName];
  if (!config) return [];

  const docs = await config.model
    .find({ [config.domainField]: domainId, status: 1 })
    .select(config.userField)
    .lean();

  return Array.from(
    new Set(
      docs
        .map((doc: any) => doc?.[config.userField])
        .filter(Boolean)
        .map((id: any) => String(id))
    )
  );
};

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized Access" }, { status: 401 });
    }

    const roleName = getRoleName(req);
    const isAdmin =
      roleName === "BUSINESS_ADMIN" ||
      roleName === "SUPER_ADMIN" ||
      roleName.includes("ADMIN");

    const businessId = await resolveActiveBusinessIdForUser(session?.user?.id);
    if (!businessId) {
      return NextResponse.json(
        { message: "Business assignment not found." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const includeTasks = parseBooleanParam(searchParams.get("includeTasks"), true);
    const includeEnquiries = parseBooleanParam(searchParams.get("includeEnquiries"), true);
    const includeCustomEvents = parseBooleanParam(searchParams.get("includeCustomEvents"), true);
    const searchText = String(searchParams.get("search") || "").trim().toLowerCase();
    const { start: filterStart, end: filterEnd } = normalizeDateRange(
      parseDateParam(searchParams.get("start_date")),
      parseDateParam(searchParams.get("end_date"))
    );

    const taskPromise = (async () => {
      if (!includeTasks) return [];

      const taskQuery: any = { business_id: businessId };

      if (!isAdmin) {
        const domainId = getDomainId(req, roleName);
        const [teamMembers, headedTeams, headStaffUserIds] = await Promise.all([
          Team_Members.find({ user_id: session.user.id }).select("team_id").lean(),
          Project_Teams.find({ team_head: session.user.id }).select("_id").lean(),
          getHeadStaffUserIds(roleName, domainId),
        ]);

        const teamIds = [
          ...teamMembers.map((item: any) => item?.team_id).filter(Boolean),
          ...headedTeams.map((item: any) => item?._id).filter(Boolean),
        ];

        taskQuery.$or = [
          { assigned_to: session.user.id },
          { creator: session.user.id },
          { assigned_teams: { $in: teamIds.length ? teamIds : [] } },
        ];

        if (headStaffUserIds.length > 0) {
          taskQuery.$or.push({ assigned_to: { $in: headStaffUserIds } });
          taskQuery.$or.push({ creator: { $in: headStaffUserIds } });
        }
      }

      const tasks = await Business_Tasks.find(taskQuery)
        .populate({ path: "assigned_to", select: "name avatar_url" })
        .populate({ path: "creator", select: "name avatar_url" })
        .populate({ path: "assigned_teams", select: "team_name" })
        .sort({ start_date: 1, createdAt: -1 })
        .lean();

      return tasks
        .filter((task: any) =>
          isWithinRange(task?.start_date || task?.createdAt, task?.end_date || task?.start_date, filterStart, filterEnd)
        )
        .map((task: any) => ({
          id: `task-${task?._id}`,
          type: "task",
          sourceId: String(task?._id || ""),
          title: String(task?.task_name || "Untitled task"),
          description: String(task?.task_description || ""),
          start: toIsoString(task?.start_date || task?.createdAt),
          end: toIsoString(task?.end_date || task?.start_date || task?.createdAt),
          status: String(task?.status || ""),
          assignedLabel:
            task?.assigned_to?.name ||
            task?.assigned_teams?.team_name ||
            "Unassigned",
          createdBy: String(task?.creator?.name || ""),
          isProjectTask: Boolean(task?.is_project_task),
        }));
    })();

    const enquiryPromise = (async () => {
      if (!includeEnquiries) return [];

      const histories = await Eq_enquiry_histories.aggregate([
        {
          $match: {
            assigned_to: new mongoose.Types.ObjectId(session.user.id),
            change_type: "FORWARD",
            enquiry_id: { $ne: null },
          },
        },
        { $sort: { enquiry_id: 1, createdAt: -1 } },
        {
          $group: {
            _id: "$enquiry_id",
            history: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$history" } },
        { $match: { is_finished: { $ne: true } } },
      ]);

      const populatedHistories = await Eq_enquiry_histories.populate(histories, [
        {
          path: "camp_id",
          select: "camp_name headoffice_id",
          populate: {
            path: "headoffice_id",
            select: "business_id",
          },
        },
        {
          path: "enquiry_id",
          select: "enquiry_uuid status next_action",
        },
        {
          path: "assigned_to",
          select: "name avatar_url",
        },
        {
          path: "forwarded_by",
          select: "name avatar_url",
        },
      ]);

      return populatedHistories
        .filter((history: any) => {
          return isWithinRange(
            history?.createdAt,
            history?.next_step_date || history?.createdAt,
            filterStart,
            filterEnd
          );
        })
        .map((history: any) => ({
          id: `enquiry-${history?._id?.toString()}`,
          type: "enquiry",
          sourceId: String(history?.enquiry_id?._id || history?.enquiry_id || ""),
          historyId: String(history?._id || ""),
          title: `Enquiry Action: ${String(history?.action || "Not Specified")}`,
          description: String(history?.enquiry_id?.next_action || history?.feedback || ""),
          start: toIsoString(history?.createdAt),
          end: toIsoString(history?.next_step_date || history?.createdAt),
          action: String(history?.action || ""),
          priority: history?.priority ?? null,
          enquiryUuid: String(history?.enquiry_id?.enquiry_uuid || ""),
          status: String(history?.enquiry_id?.status || ""),
          assignedLabel: Array.isArray(history?.assigned_to)
            ? history.assigned_to
                .map((user: any) => user?.name)
                .filter(Boolean)
                .join(", ")
            : "",
          createdBy: String(history?.forwarded_by?.name || ""),
        }));

    })();

    const customEventPromise = (async () => {
      if (!includeCustomEvents) return [];

      const eventQuery: any = {
        business_id: businessId,
        $or: [
          { created_by: session.user.id },
          { attendee_ids: session.user.id },
        ],
      };

      const events = await Calendar_Events.find(eventQuery)
        .populate({ path: "created_by", select: "name avatar_url" })
        .populate({ path: "attendee_ids", select: "name avatar_url" })
        .sort({ start_date: 1, createdAt: -1 })
        .lean();

      return events
        .filter((event: any) =>
          isWithinRange(event?.start_date, event?.end_date, filterStart, filterEnd)
        )
        .map((event: any) => ({
          id: `custom-${event?._id}`,
          type: "custom",
          sourceId: String(event?._id || ""),
          title: String(event?.title || "Untitled event"),
          description: String(event?.description || ""),
          start: toIsoString(event?.start_date),
          end: toIsoString(event?.end_date),
          status: String(event?.status || "To Do"),
          createdBy: String(event?.created_by?.name || ""),
          assignedLabel: Array.isArray(event?.attendee_ids)
            ? event.attendee_ids
                .map((user: any) => user?.name)
                .filter(Boolean)
                .join(", ")
            : "",
        }));
    })();

    const [tasks, enquiries, customEvents] = await Promise.all([
      taskPromise,
      enquiryPromise,
      customEventPromise,
    ]);

    const items = [...tasks, ...enquiries, ...customEvents]
      .filter((item: any) => {
        if (!searchText) return true;
        return [
          item?.title,
          item?.description,
          item?.assignedLabel,
          item?.enquiryUuid,
          item?.createdBy,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchText);
      })
      .sort((a: any, b: any) => {
      const aTime = a?.start ? new Date(a.start).getTime() : 0;
      const bTime = b?.start ? new Date(b.start).getTime() : 0;
      return aTime - bTime;
    });

    const filteredTasks = items.filter((item: any) => item?.type === "task").length;
    const filteredEnquiries = items.filter((item: any) => item?.type === "enquiry").length;
    const filteredCustomEvents = items.filter((item: any) => item?.type === "custom").length;

    return NextResponse.json(
      {
        items,
        summary: {
          total: items.length,
          tasks: filteredTasks,
          enquiries: filteredEnquiries,
          customEvents: filteredCustomEvents,
        },
        scope: isAdmin ? "admin" : "staff",
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error while loading calendar feed", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
