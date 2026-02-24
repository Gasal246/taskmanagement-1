import connectDB from "@/lib/mongo";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Dep_staffs from "@/models/department_staffs.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";
import {
  buildUsageBlockMessage,
  getUserActiveProjectTaskUsage,
  hasUsageBlocks,
} from "@/app/api/helpers/user-role-usage-guard";

connectDB();

const ASSIGNMENT_MODEL_BY_ROLE: Record<string, { model: any; userField: "user_id" | "staff_id" }> = {
  REGION_DEP_HEAD: { model: Region_dep_heads, userField: "user_id" },
  REGION_DEP_STAFF: { model: Region_dep_staffs, userField: "user_id" },
  AREA_DEP_HEAD: { model: Area_dep_heads, userField: "user_id" },
  AREA_DEP_STAFF: { model: Area_dep_staffs, userField: "user_id" },
  LOCATION_DEP_HEAD: { model: Location_dep_heads, userField: "user_id" },
  LOCATION_DEP_STAFF: { model: Location_dep_staffs, userField: "user_id" },
  DEPARTMENT_STAFF: { model: Dep_staffs, userField: "staff_id" },
};

export async function POST(req: NextRequest) {
  try {
    const { URoleId } = await req.json();

    if (!URoleId) {
      return NextResponse.json({ error: "User Role ID is required" }, { status: 400 });
    }

    const userRole = await User_roles.findById(URoleId);
    if (!userRole) {
      return NextResponse.json({ error: "User Role Not Found" }, { status: 404 });
    }

    await userRole.populate({ path: "role_id", select: { role_name: 1 } });
    const roleName = userRole?.role_id?.role_name;
    const userId = userRole?.user_id?.toString?.();

    if (roleName && userId) {
      const assignmentMeta = ASSIGNMENT_MODEL_BY_ROLE[roleName];
      if (assignmentMeta) {
        const activeAssignments = await assignmentMeta.model.countDocuments({
          [assignmentMeta.userField]: userId,
          $or: [{ status: { $exists: false } }, { status: { $ne: 0 } }],
        });

        if (activeAssignments > 0) {
          return NextResponse.json(
            {
              error: `Cannot remove ${roleName}. Remove all related department assignments first.`,
              assignment_count: activeAssignments,
            },
            { status: 409 }
          );
        }
      }

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

    await User_roles.deleteOne({ _id: URoleId });

    return NextResponse.json(
      { message: "User Role permanently deleted", status: 200 },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
