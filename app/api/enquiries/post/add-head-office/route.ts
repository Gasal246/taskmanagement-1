import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Admin_assign_business from "@/models/admin_assign_business.model";
import Business_staffs from "@/models/business_staffs.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  phone?: string;
  geo_location?: string;
  other_details?: string;
  address?: string;
  camp_ids?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const session: any = await auth();
    const body: Body = await req.json();

    const phone = body.phone?.trim() || "";
    const geo_location = body.geo_location?.trim() || "";
    const other_details = body.other_details?.trim() || "";
    const address = body.address?.trim() || "";

    const hasDetails = Boolean(phone || geo_location || other_details || address);

    if (!hasDetails) {
      return NextResponse.json(
        { message: "Head office details are required", status: 400 },
        { status: 400 }
      );
    }

    const businessAssignment =
      (session?.user?.id
        ? await Business_staffs.findOne({ user_id: session.user.id, status: 1 }).select("business_id").lean()
        : null) ||
      (session?.user?.id
        ? await Admin_assign_business.findOne({ user_id: session.user.id, status: 1 }).select("business_id").lean()
        : null);

    const newHeadOffice = new Eq_camp_headoffice({
      business_id: businessAssignment?.business_id || null,
      phone,
      geo_location,
      other_details,
      address,
    });

    const savedHeadOffice = await newHeadOffice.save();

    if (Array.isArray(body.camp_ids) && body.camp_ids.length) {
      await Eq_camps.updateMany(
        { _id: { $in: body.camp_ids } },
        { $set: { headoffice_id: savedHeadOffice._id } }
      );
    }

    return NextResponse.json(
      { message: "New head office created", status: 201 },
      { status: 201 }
    );
  } catch (err) {
    console.log("Error while adding head office: ", err);
    return NextResponse.json(
      { message: "Internal server error", status: 500 },
      { status: 500 }
    );
  }
}
