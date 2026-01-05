import connectDB from "@/lib/mongo";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Area_heads from "@/models/area_heads.model";
import Area_staffs from "@/models/area_staffs.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Location_heads from "@/models/location_heads.model";
import Location_staffs from "@/models/location_staffs.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Region_staffs from "@/models/region_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import "@/models/users.model";
import "@/models/region_departments.model";
import "@/models/area_departments.model";
import "@/models/location_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const user_role = searchParams.get("role_id");
    console.log("role_id: ", user_role)

    if (!user_role) {
      return NextResponse.json(
        { message: "Staff Not Found", status: 404 },
        { status: 404 }
      );
    }

    let staffDetails: any = null; // Declare outside switch

    switch (user_role) {
      case "REGION_STAFF":
        staffDetails = await Region_staffs.findOne({ staff_id: user_id })
          .populate("region_id")
          .populate({ path: "staff_id", match: { status: 1 } });
        break;

      case "AREA_HEAD":
        staffDetails = await Area_heads.findOne({ user_id: user_id })
          .populate("area_id")
          .populate({ path: "user_id", match: { status: 1 } });
        break;

      case "AREA_STAFF":
        staffDetails = await Area_staffs.findOne({ staff_id: user_id })
          .populate("area_id")
          .populate({ path: "staff_id", match: { status: 1 } });
        break;

      case "LOCATION_HEAD":
        staffDetails = await Location_heads.findOne({ user_id: user_id })
          .populate("location_id")
          .populate({ path: "user_id", match: { status: 1 } });
        break;

      case "LOCATION_STAFF":
        staffDetails = await Location_staffs.findOne({ user_id: user_id })
          .populate("location_id")
          .populate({ path: "user_id", match: { status: 1 } });
        break;

      case "REGION_DEP_HEAD":
        staffDetails = await Region_dep_heads.findOne({ user_id: user_id })
          .populate({
            path:"reg_dep_id",
            populate: {
              path: "region_id"
            }
          }).populate({ path: "user_id", match: { status: 1 } });
        break;

      case "REGION_DEP_STAFF":
        staffDetails = await Region_dep_staffs.findOne({ user_id: user_id })
          .populate({
            path: "region_dep_id",
            populate: {
              path: "region_id"
            }
          }).populate({ path: "user_id", match: { status: 1 } });
        break;

      case "AREA_DEP_HEAD":
        staffDetails = await Area_dep_heads.findOne({ user_id: user_id })
          .populate({
            path: "area_dep_id",
            populate: {
              path: "area_id"
            }
          }).populate({ path: "user_id", match: { status: 1 } });
        break;

      case "AREA_DEP_STAFF":
        staffDetails = await Area_dep_staffs.findOne({ user_id: user_id })
          .populate({
            path: "area_dep_id",
            populate: {
              path: "area_id"
            }
          }).populate({ path: "user_id", match: { status: 1 } });
        break;

      case "LOCATION_DEP_HEAD":
        staffDetails = await Location_dep_heads.findOne({ user_id: user_id })
          .populate({
            path: "location_dep_id",
            populate: {
              path: "location_id"
            }
          }).populate({ path: "user_id", match: { status: 1 } });
        break;

      case "LOCATION_DEP_STAFF":
        staffDetails = await Location_dep_staffs.findOne({ user_id: user_id })
          .populate({
            path: "location_dep_id",
            populate: {
              path: "location_id"
            }
          }).populate({ path: "user_id", match: { status: 1 } });
        break;

      default:
        return NextResponse.json(
          { message: "Staff Role Not Recognized", status: 400 },
          { status: 400 }
        );
    }

    if (!staffDetails) {
      return NextResponse.json(
        { message: "Staff details not found", status: 404 },
        { status: 404 }
      );
    }
    const staffUser = staffDetails?.user_id || staffDetails?.staff_id;
    if (!staffUser) {
      return NextResponse.json(
        { message: "Staff details not found", status: 404 },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Staff details fetched successfully",
        data: staffDetails,
        role: user_role,
      },
      { status: 200 }
    );

  } catch (err) {
    console.log("Error while getting Single Staff: ", err);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
