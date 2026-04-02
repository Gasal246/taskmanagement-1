import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import Business_areas from "@/models/business_areas.model";
import Business_locations from "@/models/business_locations.model";
import Location_departments from "@/models/location_departments.model";
import Region_departments from "@/models/region_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Un-Authorized Access", status: 401 }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const department_id = searchParams.get("department_id");
    if (!department_id) {
      return NextResponse.json({ message: "Department id is required", status: 400 }, { status: 400 });
    }

    const regionDepartment: any = await Region_departments.findById(department_id).lean();
    if (regionDepartment) {
      return NextResponse.json(
        {
          status: 200,
          data: {
            type: "region",
            region_id: regionDepartment.region_id,
          },
        },
        { status: 200 }
      );
    }

    const areaDepartment: any = await Area_departments.findById(department_id).lean();
    if (areaDepartment) {
      const area: any = await Business_areas.findById(areaDepartment.area_id).select("region_id").lean();
      return NextResponse.json(
        {
          status: 200,
          data: {
            type: "area",
            area_id: areaDepartment.area_id,
            region_id: area?.region_id || null,
          },
        },
        { status: 200 }
      );
    }

    const locationDepartment: any = await Location_departments.findById(department_id).lean();
    if (locationDepartment) {
      const location: any = await Business_locations.findById(locationDepartment.location_id)
        .select("area_id")
        .lean();
      const area: any = location?.area_id
        ? await Business_areas.findById(location.area_id).select("region_id").lean()
        : null;
      return NextResponse.json(
        {
          status: 200,
          data: {
            type: "location",
            location_id: locationDepartment.location_id,
            area_id: location?.area_id || null,
            region_id: area?.region_id || null,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "Department not found", status: 404 }, { status: 404 });
  } catch (err) {
    console.log("Error while fetching department meta: ", err);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
