import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Task_Activities from "@/models/task_activities.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Un-Authorized Access", status: 401 }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const staffIdsParam = searchParams.get("staff_ids") || "";
    const staffIds = staffIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (staffIds.length === 0) {
      return NextResponse.json({ status: 200, data: {} }, { status: 200 });
    }

    const activities = await Task_Activities.find({
      assigned_to: { $in: staffIds },
      is_done: { $ne: true },
    })
      .populate({ path: "task_id", select: "task_name" })
      .lean();

    const grouped: Record<string, any[]> = {};
    for (const activity of activities) {
      const staffId = activity?.assigned_to?.toString();
      if (!staffId) continue;
      if (!grouped[staffId]) grouped[staffId] = [];
      grouped[staffId].push({
        _id: activity?._id,
        activity: activity?.activity,
        task_id: activity?.task_id?._id,
        task_name: activity?.task_id?.task_name,
      });
    }

    return NextResponse.json({ status: 200, data: grouped }, { status: 200 });
  } catch (err) {
    console.log("Error while fetching activities by staff: ", err);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
