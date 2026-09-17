import connectDB from "@/lib/mongo";
import { enquiryActor } from "@/lib/enquiries/completion-server";
import { CatalogueValidationError, validateDynamicClassification } from "@/lib/enquiries/catalogue-server";
import { getCampVisitedStatusFromEnquiryStatus } from "@/lib/enquiries/camp-visited-status";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function PUT(req: NextRequest) {
  const actor = await enquiryActor();
  if (!actor) return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
  if (!actor.admin) return NextResponse.json({ message: "Only an administrator can approve a Facility", status: 403 }, { status: 403 });

  const body: any = await req.json();
  if (!mongoose.isValidObjectId(body?.camp_id) || !mongoose.isValidObjectId(body?.enquiry_id)) {
    return NextResponse.json({ message: "Invalid Facility or enquiry", status: 400 }, { status: 400 });
  }

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      const enquiry: any = await Eq_enquiry.findOne({ _id: body.enquiry_id, camp_id: body.camp_id }).session(dbSession);
      if (!enquiry) throw Object.assign(new Error("Enquiry and Facility do not match"), { status: 404 });
      const camp: any = await Eq_camps.findById(body.camp_id).session(dbSession);
      if (!camp) throw Object.assign(new Error("Facility not found"), { status: 404 });

      let classification;
      try { classification = await validateDynamicClassification({
        project_sector: camp.project_sector || "",
        facility_type: camp.facility_type || "",
        facility_type_other: camp.facility_type_other || "",
        facility_type_detail: camp.facility_type_detail || camp.facility_type_other || "",
        sector_field_values: camp.sector_field_values || [],
        hotel_classification: camp.hotel_classification || "",
      }); } catch (error) {
        if (error instanceof CatalogueValidationError) throw Object.assign(error, { status: 400 });
        throw error;
      }
      if (!String(camp.camp_name || "").trim()) throw Object.assign(new Error("Facility name is required before approval"), { status: 400 });
      Object.assign(camp, classification);

      camp.is_active = true;
      camp.visited_status = getCampVisitedStatusFromEnquiryStatus(enquiry.status) || "Just Added";
      camp.country_id = enquiry.country_id;
      camp.region_id = enquiry.region_id;
      camp.province_id = enquiry.province_id;
      camp.city_id = enquiry.city_id;
      camp.area_id = enquiry.area_id;
      enquiry.is_active = true;
      await Promise.all([camp.save({ session: dbSession }), enquiry.save({ session: dbSession })]);
    });
    return NextResponse.json({ message: "Facility and enquiry approved", status: 200 }, { status: 200 });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    console.error("Error while approving Facility:", error);
    return NextResponse.json({ message: error?.message || "Internal Server Error", status }, { status });
  } finally {
    await dbSession.endSession();
  }
}
