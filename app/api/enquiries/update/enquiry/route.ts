import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import Eq_camp_client_company from "@/models/eq_camp_client_company.model";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camp_landlord from "@/models/eq_camp_landlord.model";
import Eq_camp_realestate from "@/models/eq_camp_realestate.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Eq_enquiry_wifi_external from "@/models/eq_enquiry_wifi_external.model";
import Eq_enquiry_wifi_personal from "@/models/eq_enquiry_wifi_personal.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    enquiry_id?: string;

    country?: string;
    region?: string;
    province?: string;
    city?: string;

    area_input_mode?: string;
    area?: string;
    area_name_request?: string;

    camp_input_mode?: string;
    camp?: string;
    camp_name_request?: string;

    camp_type?: string;
    client_company?: string;
    landlord?: string;
    real_estate?: string;

    latitude?: string;
    longitude?: string;

    camp_capacity?: string;
    camp_occupancy?: string;

    contacts?: Array<{
        name?: string;
        phone?: string;
        email?: string;
        designation?: string;
        is_decision_maker?: string;
        authority_level?: string;
    }>;

    wifi_available?: string;
    expected_monthly_price?: string;
    other_wifi_details?: string;
    wifi_type?: string;
    contractor_name?: string;
    contract_start?: string;
    contract_expiry?: string;
    wifi_plan?: string;
    speed_mbps?: string;
    pain_points?: string;
    plain_points?: string;

    provider_plan?: string;
    personal_wifi_start?: string;
    personal_wifi_expiry?: string;
    personal_wifi_price?: string;

    head_office_address?: string;
    head_office_contact?: string;
    head_office_location?: string;
    head_office_details?: string;

    lease_expiry_due?: string;
    rent_terms?: string;

    competition_status?: string;
    competition_notes?: string;

    priority?: string;

    followup_status?: string;
    alert_date?: string;
    next_action?: string;
    next_action_due?: string;
    comments?: string;

    enquiry_brought_by?: string[];
    meeting_initiated_by?: string[];
    project_closed_by?: string[];
    project_managed_by?: string[];
    enquiry_user_notes?: string;
}

const asString = (value: unknown): string => (typeof value === "string" ? value : "");
const isBlank = (value: unknown): boolean => asString(value).trim() === "";
const toIdOrNull = (value: unknown): string | null => {
    const normalized = asString(value).trim();
    return normalized || null;
};
const toTextOrNull = (value: unknown): string | null => {
    const text = asString(value);
    return text.trim() === "" ? null : text;
};
const toNumberOrNull = (value: unknown): number | null => {
    if (isBlank(value)) return null;
    const parsed = Number(asString(value));
    return Number.isFinite(parsed) ? parsed : null;
};

export async function PUT(req: NextRequest) {
    try {
        const body: Body = await req.json();
        const enquiryId = toIdOrNull(body.enquiry_id);
        const areaInputMode = body.area_input_mode === "new" ? "new" : "existing";
        let campInputMode = body.camp_input_mode === "new" ? "new" : "existing";

        const wifiAvailability = body.wifi_available === "Yes"
            ? true
            : body.wifi_available === "No"
                ? false
                : null;
        const wifiType = asString(body.wifi_type);
        const competitionStatus = body.competition_status === "Yes"
            ? true
            : body.competition_status === "No"
                ? false
                : null;

        if (!enquiryId) {
            return NextResponse.json({ message: "Enquiry ID Missing", status: 400 }, { status: 400 });
        }

        const enquiry = await Eq_enquiry.findById(enquiryId);
        if (!enquiry) {
            return NextResponse.json({ message: "Enquiry not found", status: 404 }, { status: 404 });
        }

        const countryId = toIdOrNull(body.country);
        const regionId = toIdOrNull(body.region);
        const provinceId = toIdOrNull(body.province);
        const cityId = toIdOrNull(body.city);
        let areaId = toIdOrNull(body.area);
        let campId = toIdOrNull(body.camp);

        if (areaInputMode === "new" && !isBlank(body.area_name_request)) {
            const newArea = new Eq_area({
                country_id: countryId,
                region_id: regionId,
                province_id: provinceId,
                city_id: cityId,
                area_name: asString(body.area_name_request).trim(),
                is_active: false
            });
            const savedArea = await newArea.save();
            areaId = savedArea._id;
            campInputMode = "new";
        }

        if (campInputMode === "existing" && campId) {
            const existingEnquiry = await Eq_enquiry.findOne({
                camp_id: campId,
                _id: { $ne: enquiry._id }
            });
            if (existingEnquiry) {
                return NextResponse.json({ message: "Enquiry already added for camp", status: 400 }, { status: 200 });
            }
        }

        if (campInputMode === "new" || areaInputMode === "new") {
            let landlordId: string | null = null;
            let realestateId: string | null = null;
            let clientCompanyId: string | null = null;
            let headOfficeId: string | null = null;

            const landlordName = asString(body.landlord).toLowerCase().trim();
            if (landlordName) {
                const isLandlordExist = await Eq_camp_landlord.findOne({ landlord_name: landlordName });
                if (!isLandlordExist) {
                    const newLandlord = new Eq_camp_landlord({ landlord_name: landlordName });
                    const savedLandlord = await newLandlord.save();
                    landlordId = savedLandlord._id;
                } else {
                    landlordId = isLandlordExist._id;
                }
            }

            const realEstateName = asString(body.real_estate).toLowerCase().trim();
            if (realEstateName) {
                const isRealEstateExist = await Eq_camp_realestate.findOne({ company_name: realEstateName });
                if (!isRealEstateExist) {
                    const newRealEstate = new Eq_camp_realestate({ company_name: realEstateName });
                    const savedRealEstate = await newRealEstate.save();
                    realestateId = savedRealEstate._id;
                } else {
                    realestateId = isRealEstateExist._id;
                }
            }

            const clientCompanyName = asString(body.client_company).toLowerCase().trim();
            if (clientCompanyName) {
                const isClientCompanyExist = await Eq_camp_client_company.findOne({ client_company_name: clientCompanyName });
                if (!isClientCompanyExist) {
                    const newClientCompany = new Eq_camp_client_company({ client_company_name: clientCompanyName });
                    const savedClientCompany = await newClientCompany.save();
                    clientCompanyId = savedClientCompany._id;
                } else {
                    clientCompanyId = isClientCompanyExist._id;
                }
            }

            const hasHeadOfficePayload = [
                body.head_office_contact,
                body.head_office_address,
                body.head_office_location,
                body.head_office_details
            ].some((value) => !isBlank(value));

            if (hasHeadOfficePayload) {
                const newHeadOffice = new Eq_camp_headoffice({
                    phone: toTextOrNull(body.head_office_contact),
                    geo_location: toTextOrNull(body.head_office_location),
                    other_details: toTextOrNull(body.head_office_details),
                    address: toTextOrNull(body.head_office_address)
                });
                const savedHeadOffice = await newHeadOffice.save();
                headOfficeId = savedHeadOffice._id;
            }

            const newCamp = new Eq_camps({
                area_id: areaId,
                country_id: countryId,
                region_id: regionId,
                province_id: provinceId,
                city_id: cityId,
                landlord_id: landlordId,
                realestate_id: realestateId,
                client_company_id: clientCompanyId,
                headoffice_id: headOfficeId,
                camp_type: toTextOrNull(body.camp_type),
                camp_name: toTextOrNull(body.camp_name_request),
                camp_capacity: toTextOrNull(body.camp_capacity),
                camp_occupancy: toNumberOrNull(body.camp_occupancy),
                is_active: false,
                latitude: toTextOrNull(body.latitude),
                longitude: toTextOrNull(body.longitude),
            });

            const savedCamp = await newCamp.save();
            campId = savedCamp._id;
        } else if (campId) {
            const campToEdit = await Eq_camps.findById(campId);
            if (!campToEdit) {
                return NextResponse.json({ message: "Camp not found", status: 404 }, { status: 404 });
            }

            const hasHeadOfficePayload = [
                body.head_office_contact,
                body.head_office_address,
                body.head_office_location,
                body.head_office_details
            ].some((value) => !isBlank(value));

            if (hasHeadOfficePayload) {
                if (campToEdit.headoffice_id) {
                    const headoffice = await Eq_camp_headoffice.findById(campToEdit.headoffice_id);
                    if (headoffice) {
                        headoffice.phone = toTextOrNull(body.head_office_contact);
                        headoffice.other_details = toTextOrNull(body.head_office_details);
                        headoffice.geo_location = toTextOrNull(body.head_office_location);
                        headoffice.address = toTextOrNull(body.head_office_address);
                        await headoffice.save();
                    }
                } else {
                    const newHeadOffice = new Eq_camp_headoffice({
                        phone: toTextOrNull(body.head_office_contact),
                        geo_location: toTextOrNull(body.head_office_location),
                        other_details: toTextOrNull(body.head_office_details),
                        address: toTextOrNull(body.head_office_address)
                    });
                    const savedHeadoffice = await newHeadOffice.save();
                    campToEdit.headoffice_id = savedHeadoffice._id;
                }
            } else if (campToEdit.headoffice_id) {
                await Eq_camp_headoffice.findByIdAndDelete(campToEdit.headoffice_id);
                campToEdit.headoffice_id = null;
            }

            const landlordName = asString(body.landlord).toLowerCase().trim();
            if (landlordName) {
                if (campToEdit.landlord_id) {
                    await Eq_camp_landlord.findByIdAndUpdate(campToEdit.landlord_id, {
                        $set: { landlord_name: landlordName }
                    });
                } else {
                    const newLandlord = new Eq_camp_landlord({ landlord_name: landlordName });
                    const savedLandlord = await newLandlord.save();
                    campToEdit.landlord_id = savedLandlord._id;
                }
            } else {
                campToEdit.landlord_id = null;
            }

            const clientCompanyName = asString(body.client_company).toLowerCase().trim();
            if (clientCompanyName) {
                if (campToEdit.client_company_id) {
                    await Eq_camp_client_company.findByIdAndUpdate(campToEdit.client_company_id, {
                        $set: { client_company_name: clientCompanyName }
                    });
                } else {
                    const newClientCompany = new Eq_camp_client_company({ client_company_name: clientCompanyName });
                    const savedClientCompany = await newClientCompany.save();
                    campToEdit.client_company_id = savedClientCompany._id;
                }
            } else {
                campToEdit.client_company_id = null;
            }

            const realEstateName = asString(body.real_estate).toLowerCase().trim();
            if (realEstateName) {
                if (campToEdit.realestate_id) {
                    await Eq_camp_realestate.findByIdAndUpdate(campToEdit.realestate_id, {
                        $set: { company_name: realEstateName }
                    });
                } else {
                    const newRealEstate = new Eq_camp_realestate({ company_name: realEstateName });
                    const savedRealEstate = await newRealEstate.save();
                    campToEdit.realestate_id = savedRealEstate._id;
                }
            } else {
                campToEdit.realestate_id = null;
            }

            campToEdit.camp_name = toTextOrNull(body.camp_name_request);
            campToEdit.camp_capacity = toTextOrNull(body.camp_capacity);
            campToEdit.camp_type = toTextOrNull(body.camp_type);
            campToEdit.camp_occupancy = toNumberOrNull(body.camp_occupancy);
            campToEdit.country_id = countryId;
            campToEdit.region_id = regionId;
            campToEdit.province_id = provinceId;
            campToEdit.city_id = cityId;
            campToEdit.area_id = areaId;
            campToEdit.latitude = toTextOrNull(body.latitude);
            campToEdit.longitude = toTextOrNull(body.longitude);

            await campToEdit.save();
        }

        enquiry.country_id = countryId;
        enquiry.region_id = regionId;
        enquiry.province_id = provinceId;
        enquiry.city_id = cityId;
        enquiry.area_id = areaId;
        enquiry.camp_id = campId;
        enquiry.status = toTextOrNull(body.followup_status);
        enquiry.priority = toTextOrNull(body.priority);
        enquiry.alert_date = toTextOrNull(body.alert_date);
        enquiry.due_date = toTextOrNull(body.next_action_due);
        enquiry.wifi_available = wifiAvailability;
        enquiry.wifi_type = wifiAvailability === true ? toTextOrNull(wifiType) : null;
        const expectedCost = toTextOrNull(body.expected_monthly_price);
        enquiry.expected_wifi_cost = wifiAvailability === false ? expectedCost : null;
        enquiry.lease_expiry_due = toTextOrNull(body.lease_expiry_due);
        enquiry.competition_status = competitionStatus;
        enquiry.competition_notes = toTextOrNull(body.competition_notes);
        enquiry.next_action = toTextOrNull(body.next_action);
        enquiry.next_action_due = toTextOrNull(body.next_action_due);
        enquiry.comments = toTextOrNull(body.comments);
        enquiry.rent_terms = toTextOrNull(body.rent_terms);
        enquiry.wifi_setup = wifiAvailability === true && wifiType === "Other Sources" ? toTextOrNull(body.other_wifi_details) : null;
        enquiry.latitude = toTextOrNull(body.latitude);
        enquiry.longitude = toTextOrNull(body.longitude);
        enquiry.is_active = areaInputMode === "existing" && campInputMode === "existing" && Boolean(areaId && campId);
        if (Array.isArray(body.enquiry_brought_by)) {
            enquiry.enquiry_brought_by = body.enquiry_brought_by;
        }
        if (Array.isArray(body.meeting_initiated_by)) {
            enquiry.meeting_initiated_by = body.meeting_initiated_by;
        }
        if (Array.isArray(body.project_closed_by)) {
            enquiry.project_closed_by = body.project_closed_by;
        }
        if (Array.isArray(body.project_managed_by)) {
            enquiry.project_managed_by = body.project_managed_by;
        }
        if (body.enquiry_user_notes !== undefined) {
            enquiry.enquiry_user_notes = toTextOrNull(body.enquiry_user_notes);
        }

        await enquiry.save();

        await Eq_enquiry_histories.updateMany({ enquiry_id: enquiry._id }, { $set: { camp_id: campId } });
        await Eq_enquiry_access.updateMany({ enquiry_id: enquiry._id }, { $set: { camp_id: campId } });

        await Eq_camp_contacts.deleteMany({ enquiry_id: enquiry._id });
        if (Array.isArray(body.contacts) && body.contacts.length > 0) {
            const newContacts = body.contacts.map((contact) => ({
                contact_name: toTextOrNull(contact.name),
                contact_phone: toTextOrNull(contact.phone),
                contact_email: toTextOrNull(contact.email),
                contact_authorization: toTextOrNull(contact.authority_level),
                contact_designation: toTextOrNull(contact.designation),
                is_decision_maker: contact.is_decision_maker === "Yes",
                camp_id: campId,
                enquiry_id: enquiry._id
            }));
            await Eq_camp_contacts.insertMany(newContacts);
        }

        await Eq_enquiry_wifi_external.deleteMany({ enquiry_id: enquiry._id });
        await Eq_enquiry_wifi_personal.deleteMany({ enquiry_id: enquiry._id });

        if (wifiAvailability === true) {
            switch (wifiType) {
                case "Existing Contractor": {
                    const painPoints = toTextOrNull(body.pain_points) || toTextOrNull(body.plain_points);
                    const newExistingWifi = new Eq_enquiry_wifi_external({
                        camp_id: campId,
                        enquiry_id: enquiry._id,
                        contractor_name: toTextOrNull(body.contractor_name),
                        contract_start_date: toTextOrNull(body.contract_start),
                        contract_end_date: toTextOrNull(body.contract_expiry),
                        contract_speed: toTextOrNull(body.speed_mbps),
                        contract_package: toTextOrNull(body.wifi_plan),
                        plain_points: painPoints
                    });

                    await newExistingWifi.save();
                    break;
                }

                case "Personal WiFi": {
                    const newPersonalWifi = new Eq_enquiry_wifi_personal({
                        camp_id: campId,
                        enquiry_id: enquiry._id,
                        personal_plan: toTextOrNull(body.provider_plan),
                        personal_start_date: toTextOrNull(body.personal_wifi_start),
                        personal_end_date: toTextOrNull(body.personal_wifi_expiry),
                        personal_monthly_price: toTextOrNull(body.personal_wifi_price)
                    });

                    await newPersonalWifi.save();
                    break;
                }
            }
        }

        return NextResponse.json({ message: "Enquiry updated", status: 200 }, { status: 200 });
    } catch (err) {
        console.log("Error while updating enquiry: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}
