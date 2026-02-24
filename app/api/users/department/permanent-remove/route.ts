import connectDB from "@/lib/mongo";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Dep_staffs from "@/models/department_staffs.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";
import {
  buildUsageBlockMessage,
  getUserActiveProjectTaskUsage,
  hasUsageBlocks,
} from "@/app/api/helpers/user-role-usage-guard";

connectDB();

const DEPARTMENT_ASSIGNMENT_MODELS: Record<string, any> = {
  region_dep_heads: Region_dep_heads,
  region_dep_staffs: Region_dep_staffs,
  area_dep_heads: Area_dep_heads,
  area_dep_staffs: Area_dep_staffs,
  location_dep_heads: Location_dep_heads,
  location_dep_staffs: Location_dep_staffs,
  dep_staffs: Dep_staffs,
};

const USER_FIELD_BY_MODEL: Record<string, "user_id" | "staff_id"> = {
  region_dep_heads: "user_id",
  region_dep_staffs: "user_id",
  area_dep_heads: "user_id",
  area_dep_staffs: "user_id",
  location_dep_heads: "user_id",
  location_dep_staffs: "user_id",
  dep_staffs: "staff_id",
};

const ROLE_NAME_BY_MODEL: Record<string, string> = {
  region_dep_heads: "REGION_DEP_HEAD",
  region_dep_staffs: "REGION_DEP_STAFF",
  area_dep_heads: "AREA_DEP_HEAD",
  area_dep_staffs: "AREA_DEP_STAFF",
  location_dep_heads: "LOCATION_DEP_HEAD",
  location_dep_staffs: "LOCATION_DEP_STAFF",
  dep_staffs: "DEPARTMENT_STAFF",
};

export async function POST(req: NextRequest) {
  try {
    const { assignmentId, assignmentModel } = await req.json();

    if (!assignmentId || !assignmentModel) {
      return NextResponse.json(
        { error: "assignmentId and assignmentModel are required" },
        { status: 400 }
      );
    }

    const Model = DEPARTMENT_ASSIGNMENT_MODELS[assignmentModel];
    if (!Model) {
      return NextResponse.json({ error: "Invalid assignment model" }, { status: 400 });
    }

    const assignment = await Model.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json({ error: "Department assignment not found" }, { status: 404 });
    }

    const userField = USER_FIELD_BY_MODEL[assignmentModel];
    const userId = assignment?.[userField]?.toString?.();
    if (!userId) {
      return NextResponse.json({ error: "Assignment user not found" }, { status: 400 });
    }

    const roleName = ROLE_NAME_BY_MODEL[assignmentModel];
    if (roleName) {
      const usage = await getUserActiveProjectTaskUsage(userId);
      if (hasUsageBlocks(usage)) {
        return NextResponse.json(
          {
            error: buildUsageBlockMessage(roleName, usage),
            usage,
          },
          { status: 409 }
        );
      }
    }

    await Model.deleteOne({ _id: assignmentId });

    if (roleName) {
      const remainingAssignments = await Model.countDocuments({
        [userField]: userId,
        $or: [{ status: { $exists: false } }, { status: { $ne: 0 } }],
      });

      if (remainingAssignments === 0) {
        const role = await Roles.findOne({ role_name: roleName });
        if (role?._id) {
          await User_roles.deleteOne({ user_id: userId, role_id: role._id });
        }
      }
    }

    return NextResponse.json(
      { message: "Department assignment permanently deleted", status: 200 },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
