import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { preserveInitialAction } from "@/lib/enquiries/completion-server";
import { validateEnquiryFacilityPayload, solutionFields } from "@/lib/enquiries/facility-payload";
import { CatalogueValidationError } from "@/lib/enquiries/catalogue-server";
import { formatEnquiryUuid } from "@/lib/enquiries/enquiry-uuid";
import Admin_assign_business from "@/models/admin_assign_business.model";
import Business_staffs from "@/models/business_staffs.model";
import Eq_area from "@/models/eq_area.model";
import Eq_camp_client_company from "@/models/eq_camp_client_company.model";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camp_landlord from "@/models/eq_camp_landlord.model";
import Eq_camp_realestate from "@/models/eq_camp_realestate.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_Countries from "@/models/eq_countries.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_comments from "@/models/eq_enquiry_comments.model";
import Eq_enquiry_wifi_external from "@/models/eq_enquiry_wifi_external.model";
import Eq_enquiry_wifi_personal from "@/models/eq_enquiry_wifi_personal.model";
import Eq_region from "@/models/eq_region.model";
import { saveEnquirySolutions, saveFacilitySolutions } from "@/app/api/helpers/enquiry-solutions";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

connectDB();

class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function findOrCreate(model: any, query: any, create: any, session: mongoose.ClientSession) {
  const existing = await model.findOne(query).session(session);
  if (existing) return existing._id;
  const [saved] = await model.create([create], { session });
  return saved._id;
}

async function createUuid(body: any, projectSectorKey: string, session: mongoose.ClientSession) {
  const now = new Date();
  const [country, region]: any[] = await Promise.all([
    Eq_Countries.findById(body.country).select("country_name").session(session).lean(),
    Eq_region.findById(body.region).select("region_name").session(session).lean(),
  ]);
  let prefix = country?.country_name === "KSA" ? "KSA" : country?.country_name === "UAE" ? "UAE" : country?.country_name === "Oman" ? "OMN" : "EQ";
  if (prefix === "KSA") {
    const regionCode: Record<string, string> = {
      "central region": "CR", "eastern region": "ER", "western region": "WR", "southern region": "SR",
    };
    const code = regionCode[String(region?.region_name || "").toLowerCase()];
    if (code) prefix += `-${code}`;
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const count = await Eq_enquiry.countDocuments({ createdAt: { $gte: start, $lte: end }, country_id: body.country, region_id: body.region }).session(session);
  return formatEnquiryUuid(prefix, projectSectorKey, now, count + 1);
}

export async function POST(req: NextRequest) {
  const sessionData: any = await auth();
  if (!sessionData?.user?.id) return NextResponse.json({ message: "Unauthorized Access", status: 401 }, { status: 401 });

  const dbSession = await mongoose.startSession();
  try {
    const body: any = await req.json();
    if (body.followup_status === "Closed") throw new RequestError(400, "Create the enquiry first, then record completed actions");
    const facility = await validateEnquiryFacilityPayload(body);
    const solutions = solutionFields(facility);
    const requestingFacility = facility.area_input_mode === "new" || facility.camp_input_mode === "new";
    let savedEnquiryId = "";

    await dbSession.withTransaction(async () => {
      let areaId: any = facility.area_input_mode === "existing" ? body.area : null;
      let campId: any = facility.camp_input_mode === "existing" && facility.area_input_mode === "existing" ? facility.camp : null;
      let projectSectorKey = facility.project_sector || "";

      if (campId) {
        const existingCamp: any = await Eq_camps.findOne({ _id: campId, is_active: true }).session(dbSession).lean();
        if (!existingCamp) throw new RequestError(400, "Select an active Facility");
        if (await Eq_enquiry.exists({ camp_id: campId }).session(dbSession)) throw new RequestError(409, "Enquiry already added for this Facility");
        areaId = existingCamp.area_id;
        body.country = String(existingCamp.country_id || body.country || "");
        body.region = String(existingCamp.region_id || body.region || "");
        body.province = String(existingCamp.province_id || body.province || "");
        body.city = String(existingCamp.city_id || body.city || "");
        projectSectorKey = String(existingCamp.project_sector || "");
      }

      if (facility.area_input_mode === "new") {
        if (!text(facility.area_name_request)) throw new RequestError(400, "New area name is required");
        const [area] = await Eq_area.create([{
          country_id: body.country, region_id: body.region, province_id: body.province || null,
          city_id: body.city || null, area_name: facility.area_name_request, is_active: false,
        }], { session: dbSession });
        areaId = area._id;
      }

      if (requestingFacility) {
        const assignment: any = await Business_staffs.findOne({ user_id: sessionData.user.id, status: 1 }).select("business_id").session(dbSession).lean()
          || await Admin_assign_business.findOne({ user_id: sessionData.user.id, status: 1 }).select("business_id").session(dbSession).lean();
        const normalize = (value: string) => value.toLowerCase().trim();
        const landlordId = facility.landlord ? await findOrCreate(Eq_camp_landlord, { landlord_name: normalize(facility.landlord) }, { landlord_name: normalize(facility.landlord) }, dbSession) : null;
        const realestateId = facility.real_estate ? await findOrCreate(Eq_camp_realestate, { company_name: normalize(facility.real_estate) }, { company_name: normalize(facility.real_estate) }, dbSession) : null;
        const clientCompanyId = facility.client_company ? await findOrCreate(Eq_camp_client_company, { client_company_name: normalize(facility.client_company) }, { client_company_name: normalize(facility.client_company) }, dbSession) : null;

        let headOfficeId: any = null;
        if (facility.selected_head_office_id && mongoose.isValidObjectId(facility.selected_head_office_id)) {
          const selected: any = await Eq_camp_headoffice.findOne({
            _id: facility.selected_head_office_id,
            $or: [{ created_by: sessionData.user.id }, { createdBy: sessionData.user.id }],
          }).session(dbSession).lean();
          if (selected) headOfficeId = selected._id;
        }
        if (!headOfficeId && (facility.head_office_address || facility.head_office_contact || facility.head_office_location || facility.head_office_details)) {
          const [office] = await Eq_camp_headoffice.create([{
            business_id: assignment?.business_id || null, created_by: sessionData.user.id, createdBy: sessionData.user.id,
            phone: facility.head_office_contact, address: facility.head_office_address,
            geo_location: facility.head_office_location, other_details: facility.head_office_details,
          }], { session: dbSession });
          headOfficeId = office._id;
        }

        const [camp] = await Eq_camps.create([{
          country_id: body.country, region_id: body.region, province_id: body.province || null,
          city_id: body.city || null, area_id: areaId, landlord_id: landlordId,
          realestate_id: realestateId, client_company_id: clientCompanyId, headoffice_id: headOfficeId,
          camp_name: facility.camp_name_request, project_sector: facility.project_sector,
          facility_type: facility.facility_type, facility_type_other: facility.facility_type_other,
          facility_type_detail: facility.facility_type_detail, sector_field_values: facility.sector_field_values,
          capacity_unit: facility.capacity_unit,
          project_stage: facility.project_stage, ownership: facility.ownership,
          camp_capacity: facility.camp_capacity, camp_occupancy: facility.camp_occupancy,
          latitude: facility.latitude, longitude: facility.longitude,
          is_active: false, is_eq_added: true, visited_status: "Just Added",
        }], { session: dbSession });
        campId = camp._id;
        await saveFacilitySolutions(campId, solutions, dbSession);
      }

      if (!areaId || !campId) throw new RequestError(400, "Area and Facility are required");
      const uuid = await createUuid(body, projectSectorKey, dbSession);
      const wifiAvailable = body.wifi_available === "Yes" ? true : body.wifi_available === "No" ? false : null;
      const [enquiry] = await Eq_enquiry.create([{
        country_id: body.country, region_id: body.region, province_id: body.province || null,
        city_id: body.city || null, area_id: areaId, camp_id: campId, createdBy: sessionData.user.id,
        enquiry_uuid: uuid, is_active: !requestingFacility, status: body.followup_status,
        priority: body.priority || null, alert_date: body.alert_date || null, due_date: body.next_action_due || null,
        wifi_available: wifiAvailable, wifi_type: wifiAvailable === true ? body.wifi_type || null : null,
        expected_wifi_cost: wifiAvailable === false ? body.expected_monthly_price || null : null,
        lease_expiry_due: body.lease_expiry_due || null,
        competition_status: body.competition_status === "Yes", competition_notes: body.competition_notes || null,
        next_action: body.next_action || null, next_action_due: body.next_action_due || null,
        comments: body.comments || null, rent_terms: body.rent_terms || null,
        wifi_setup: wifiAvailable === true && body.wifi_type === "Other Sources" ? body.other_wifi_details || null : null,
        enquiry_brought_by: Array.isArray(body.enquiry_brought_by) ? body.enquiry_brought_by : [],
        meeting_initiated_by: Array.isArray(body.meeting_initiated_by) ? body.meeting_initiated_by : [],
        project_closed_by: Array.isArray(body.project_closed_by) ? body.project_closed_by : [],
        project_managed_by: Array.isArray(body.project_managed_by) ? body.project_managed_by : [],
        enquiry_user_notes: body.enquiry_user_notes || null,
      }], { session: dbSession });
      savedEnquiryId = String(enquiry._id);
      await saveEnquirySolutions(enquiry._id, solutions, dbSession);
      await preserveInitialAction(enquiry, dbSession);

      const initialComment = text(body.comments);
      if (initialComment) await Eq_enquiry_comments.create([{ enquiry_id: enquiry._id, user_id: sessionData.user.id, comment: initialComment }], { session: dbSession });

      const contacts = (Array.isArray(body.contacts) ? body.contacts : []).filter((contact: any) => text(contact?.name) || text(contact?.phone));
      if (contacts.length) await Eq_camp_contacts.insertMany(contacts.map((contact: any) => ({
        contact_name: text(contact.name), contact_phone: text(contact.phone), contact_email: text(contact.email),
        contact_authorization: text(contact.authority_level), contact_designation: text(contact.designation),
        is_decision_maker: contact.is_decision_maker === "Yes", camp_id: campId, enquiry_id: enquiry._id,
      })), { session: dbSession });

      if (wifiAvailable && body.wifi_type === "Existing Contractor") await Eq_enquiry_wifi_external.create([{
        camp_id: campId, enquiry_id: enquiry._id, contractor_name: body.contractor_name || null,
        contract_start_date: body.contract_start || null, contract_end_date: body.contract_expiry || null,
        contract_speed: body.speed_mbps || null, contract_package: body.wifi_plan || null,
        plain_points: body.pain_points || body.plain_points || null,
      }], { session: dbSession });
      if (wifiAvailable && body.wifi_type === "Personal WiFi") await Eq_enquiry_wifi_personal.create([{
        camp_id: campId, enquiry_id: enquiry._id, personal_plan: body.provider_plan || null,
        personal_start_date: body.personal_wifi_start || null, personal_end_date: body.personal_wifi_expiry || null,
        personal_monthly_price: body.personal_wifi_price || null,
      }], { session: dbSession });
    });

    return NextResponse.json({ message: "Enquiry created successfully", enquiry_id: savedEnquiryId, status: 201 }, { status: 201 });
  } catch (error: any) {
    if (error instanceof RequestError) return NextResponse.json({ message: error.message, status: error.status }, { status: error.status });
    if (error instanceof CatalogueValidationError) return NextResponse.json({ message: error.message, status: 400 }, { status: 400 });
    if (error instanceof ZodError) return NextResponse.json({ message: error.issues[0]?.message || "Invalid Facility details", errors: error.flatten().fieldErrors, status: 400 }, { status: 400 });
    console.error("Error while adding new enquiry:", error);
    return NextResponse.json({ message: error?.message || "Internal server error", status: 500 }, { status: 500 });
  } finally {
    await dbSession.endSession();
  }
}
