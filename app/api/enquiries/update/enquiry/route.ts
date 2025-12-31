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
    enquiry_id: string;

    country: string;
    region: string;
    province: string;
    city: string;

    area_input_mode: string;
    area: string;
    area_name_request: string;

    camp_input_mode: string;
    camp: string;
    camp_name_request: string;

    camp_type: string;
    client_company: string;
    landlord: string;
    real_estate: string;

    latitude: string;
    longitude: string;

    camp_capacity: string;
    camp_occupancy: string;

    contacts: Array<{
        name: string;
        phone: string;
        email?: string;
        designation?: string;
        is_decision_maker?: string;
        authority_level?: string;
    }>;

    wifi_available: string;
    expected_monthly_price: string;
    other_wifi_details: string;
    wifi_type: string;
    contractor_name: string;
    contract_start: string;
    contract_expiry: string;
    wifi_plan: string;
    speed_mbps: string;
    pain_points?: string;
    plain_points?: string;

    provider_plan: string;
    personal_wifi_start: string;
    personal_wifi_expiry: string;
    personal_wifi_price: string;

    head_office_address: string;
    head_office_contact: string;
    head_office_location: string;
    head_office_details: string;

    lease_expiry_due: string;
    rent_terms: string;

    competition_status: string;
    competition_notes: string;

    priority: string;

    followup_status: string;
    alert_date: string;
    next_action: string;
    next_action_due: string;
    comments?: string;
}

export async function PUT(req: NextRequest) {
    try {
        const body: Body = await req.json();
        const wifiAvailability = body.wifi_available === "Yes"
            ? true
            : body.wifi_available === "No"
                ? false
                : null;

        if (!body.enquiry_id) {
            return NextResponse.json({ message: "Enquiry ID Missing", status: 400 }, { status: 400 });
        }

        const enquiry = await Eq_enquiry.findById(body.enquiry_id);
        if (!enquiry) {
            return NextResponse.json({ message: "Enquiry not found", status: 404 }, { status: 404 });
        }

        let areaId = body.area;
        let campId = body.camp;

        if (body.area_input_mode === "new" && body.area_name_request) {
            const newArea = new Eq_area({
                country_id: body.country,
                region_id: body.region,
                province_id: body.province,
                city_id: body.city,
                area_name: body.area_name_request,
                is_active: false
            });
            const savedArea = await newArea.save();
            areaId = savedArea._id;
            body.camp_input_mode = "new";
        }

        if (body.camp_input_mode === "existing" && campId) {
            const existingEnquiry = await Eq_enquiry.findOne({
                camp_id: campId,
                _id: { $ne: enquiry._id }
            });
            if (existingEnquiry) {
                return NextResponse.json({ message: "Enquiry already added for camp", status: 400 }, { status: 200 });
            }
        }

        if (body.camp_input_mode === "new" || body.area_input_mode === "new") {
            let landlordId = "";
            let realestateId = "";
            let client_companyId = "";
            let headOfficeId = "";

            if (body.landlord) {
                const isLandlordExist = await Eq_camp_landlord.findOne({ landlord_name: body.landlord?.toLowerCase().trim() });
                if (!isLandlordExist) {
                    const newLandlord = new Eq_camp_landlord({
                        landlord_name: body.landlord?.toLowerCase().trim()
                    });
                    const savedLandlord = await newLandlord.save();
                    landlordId = savedLandlord._id;
                } else {
                    landlordId = isLandlordExist._id;
                }
            }

            if (body.real_estate) {
                const isRealEstateExist = await Eq_camp_realestate.findOne({ company_name: body.real_estate.toLowerCase().trim() });
                if (!isRealEstateExist) {
                    const newRealEstate = new Eq_camp_realestate({
                        company_name: body.real_estate.toLowerCase().trim()
                    });
                    const savedRealEstate = await newRealEstate.save();
                    realestateId = savedRealEstate._id;
                } else {
                    realestateId = isRealEstateExist._id;
                }
            }

            if (body.client_company) {
                const isClientCompanyExist = await Eq_camp_client_company.findOne({ client_company_name: body.client_company.toLowerCase().trim() });
                if (!isClientCompanyExist) {
                    const newClientCompany = new Eq_camp_client_company({
                        client_company_name: body.client_company.toLowerCase().trim()
                    });
                    const savedClientCompany = await newClientCompany.save();
                    client_companyId = savedClientCompany._id;
                } else {
                    client_companyId = isClientCompanyExist._id;
                }
            }

            if (body.head_office_contact || body.head_office_address || body.head_office_location || body.head_office_details) {
                const newHeadOffice = new Eq_camp_headoffice({
                    phone: body.head_office_contact,
                    geo_location: body.head_office_location,
                    other_details: body.head_office_details,
                    address: body.head_office_address
                });
                const savedHeadOffice = await newHeadOffice.save();
                headOfficeId = savedHeadOffice._id;
            }

            const newCamp = new Eq_camps({
                area_id: areaId,
                country_id: body.country,
                region_id: body.region,
                province_id: body.province,
                city_id: body.city,
                landlord_id: landlordId || null,
                realestate_id: realestateId || null,
                client_company_id: client_companyId || null,
                headoffice_id: headOfficeId || null,
                camp_type: body.camp_type,
                camp_name: body.camp_name_request,
                camp_capacity: body.camp_capacity,
                camp_occupancy: body.camp_occupancy,
                is_active: false,
                latitude: body.latitude,
                longitude: body.longitude,
            });

            const savedCamp = await newCamp.save();
            campId = savedCamp._id;
        } else if (campId) {
            const campToEdit = await Eq_camps.findById(campId);
            if (!campToEdit) {
                return NextResponse.json({ message: "Camp not found", status: 404 }, { status: 404 });
            }

            const hasHeadOfficePayload = Boolean(
                body.head_office_contact ||
                body.head_office_address ||
                body.head_office_location ||
                body.head_office_details
            );

            if (hasHeadOfficePayload) {
                if (campToEdit.headoffice_id) {
                    const headoffice = await Eq_camp_headoffice.findById(campToEdit.headoffice_id);
                    if (headoffice) {
                        if (body.head_office_contact) headoffice.phone = body.head_office_contact;
                        if (body.head_office_details) headoffice.other_details = body.head_office_details;
                        if (body.head_office_location) headoffice.geo_location = body.head_office_location;
                        if (body.head_office_address) headoffice.address = body.head_office_address;
                        await headoffice.save();
                    }
                } else {
                    const newHeadOffice = new Eq_camp_headoffice({
                        phone: body.head_office_contact,
                        geo_location: body.head_office_location,
                        other_details: body.head_office_details,
                        address: body.head_office_address
                    });
                    const saved_headoffice = await newHeadOffice.save();
                    campToEdit.headoffice_id = saved_headoffice._id;
                }
            } else if (campToEdit.headoffice_id) {
                await Eq_camp_headoffice.findByIdAndDelete(campToEdit.headoffice_id);
                campToEdit.headoffice_id = null;
            }

            if (body.landlord) {
                if (campToEdit.landlord_id) {
                    await Eq_camp_landlord.findByIdAndUpdate(campToEdit.landlord_id, {
                        $set: { landlord_name: body.landlord.toLowerCase().trim() }
                    });
                } else {
                    const newLandlord = new Eq_camp_landlord({
                        landlord_name: body.landlord.toLowerCase().trim()
                    });
                    const savedLandlord = await newLandlord.save();
                    campToEdit.landlord_id = savedLandlord._id;
                }
            }

            if (body.client_company) {
                if (campToEdit.client_company_id) {
                    await Eq_camp_client_company.findByIdAndUpdate(campToEdit.client_company_id, {
                        $set: { client_company_name: body.client_company.toLowerCase().trim() }
                    });
                } else {
                    const newClientCompany = new Eq_camp_client_company({
                        client_company_name: body.client_company.toLowerCase().trim()
                    });
                    const savedClientCompany = await newClientCompany.save();
                    campToEdit.client_company_id = savedClientCompany._id;
                }
            }

            if (body.real_estate) {
                if (campToEdit.realestate_id) {
                    await Eq_camp_realestate.findByIdAndUpdate(campToEdit.realestate_id, {
                        $set: { company_name: body.real_estate.toLowerCase().trim() }
                    });
                } else {
                    const newRealEstate = new Eq_camp_realestate({
                        company_name: body.real_estate.toLowerCase().trim()
                    });
                    const savedRealEstate = await newRealEstate.save();
                    campToEdit.realestate_id = savedRealEstate._id;
                }
            }

            if (body.camp_name_request) campToEdit.camp_name = body.camp_name_request;
            if (body.camp_capacity) campToEdit.camp_capacity = body.camp_capacity;
            if (body.camp_type) campToEdit.camp_type = body.camp_type;
            if (body.camp_occupancy !== undefined && body.camp_occupancy !== null && body.camp_occupancy !== "") {
                campToEdit.camp_occupancy = Number(body.camp_occupancy);
            }

            campToEdit.country_id = body.country || campToEdit.country_id;
            campToEdit.region_id = body.region || campToEdit.region_id;
            campToEdit.province_id = body.province || campToEdit.province_id;
            campToEdit.city_id = body.city || campToEdit.city_id;
            campToEdit.area_id = areaId || campToEdit.area_id;

            if (body.latitude) campToEdit.latitude = body.latitude;
            if (body.longitude) campToEdit.longitude = body.longitude;

            await campToEdit.save();
        }

        enquiry.country_id = body.country;
        enquiry.region_id = body.region;
        enquiry.province_id = body.province;
        enquiry.city_id = body.city;
        enquiry.area_id = areaId;
        enquiry.camp_id = campId;
        enquiry.status = body.followup_status;
        enquiry.priority = body.priority;
        enquiry.alert_date = body.alert_date || null;
        enquiry.due_date = body.next_action_due || null;
        enquiry.wifi_available = wifiAvailability;
        enquiry.wifi_type = wifiAvailability === true ? body.wifi_type : null;
        const expectedCost = body.expected_monthly_price === "" ? null : body.expected_monthly_price;
        enquiry.expected_wifi_cost = wifiAvailability === false ? expectedCost : null;
        enquiry.lease_expiry_due = body.lease_expiry_due || null;
        enquiry.competition_status = body.competition_status === "Yes";
        enquiry.competition_notes = body.competition_notes || null;
        enquiry.next_action = body.next_action;
        enquiry.next_action_due = body.next_action_due || null;
        enquiry.comments = body.comments || null;
        enquiry.rent_terms = body.rent_terms;
        enquiry.wifi_setup = wifiAvailability === true && body.wifi_type === "Other Sources" ? body.other_wifi_details : null;
        enquiry.latitude = body.latitude;
        enquiry.longitude = body.longitude;
        enquiry.is_active = body.area_input_mode === "existing" && body.camp_input_mode === "existing";

        await enquiry.save();

        await Eq_enquiry_histories.updateMany({ enquiry_id: enquiry._id }, { $set: { camp_id: campId } });
        await Eq_enquiry_access.updateMany({ enquiry_id: enquiry._id }, { $set: { camp_id: campId } });

        await Eq_camp_contacts.deleteMany({ enquiry_id: enquiry._id });
        if (Array.isArray(body.contacts) && body.contacts.length > 0) {
            const newContacts = body.contacts.map((contact) => ({
                contact_name: contact.name,
                contact_phone: contact.phone,
                contact_email: contact.email,
                contact_authorization: contact.authority_level,
                contact_designation: contact.designation,
                is_decision_maker: contact.is_decision_maker === "Yes",
                camp_id: campId,
                enquiry_id: enquiry._id
            }));
            await Eq_camp_contacts.insertMany(newContacts);
        }

        await Eq_enquiry_wifi_external.deleteMany({ enquiry_id: enquiry._id });
        await Eq_enquiry_wifi_personal.deleteMany({ enquiry_id: enquiry._id });

        if (wifiAvailability === true) {
            switch (body.wifi_type) {
                case "Existing Contractor": {
                    const painPoints = body.pain_points || body.plain_points || null;
                    const newExistingWifi = new Eq_enquiry_wifi_external({
                        camp_id: campId,
                        enquiry_id: enquiry._id,
                        contractor_name: body.contractor_name,
                        contract_start_date: body.contract_start || null,
                        contract_end_date: body.contract_expiry || null,
                        contract_speed: body.speed_mbps,
                        contract_package: body.wifi_plan,
                        plain_points: painPoints
                    });

                    await newExistingWifi.save();
                    break;
                }

                case "Personal WiFi": {
                    const newPersonalWifi = new Eq_enquiry_wifi_personal({
                        camp_id: campId,
                        enquiry_id: enquiry._id,
                        personal_plan: body.provider_plan,
                        personal_start_date: body.personal_wifi_start || null,
                        personal_end_date: body.personal_wifi_expiry || null,
                        personal_monthly_price: body.personal_wifi_price === "" ? null : body.personal_wifi_price
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
