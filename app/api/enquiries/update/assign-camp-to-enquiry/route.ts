import { inTransaction } from "@/lib/jobs/transaction";
import { enqueueNotifications } from "@/lib/jobs/enqueue";
import { authorizeEnquiry, canChangeEnquiryFacility } from "@/lib/enquiries/access";
import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_Enquiry_Edit from "@/models/eq_enquiry_edit.model";
import Eq_Enquiry_External_Wifi_Edit from "@/models/eq_enquiry_external_wifi_edit.model";
import Eq_Enquiry_Personal_Wifi_Edit from "@/models/eq_enquriy_personal_wifi_edit.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Eq_enquiry_wifi_external from "@/models/eq_enquiry_wifi_external.model";
import Eq_enquiry_wifi_personal from "@/models/eq_enquiry_wifi_personal.model";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Eq_enquiry_solutions from "@/models/eq_enquiry_solutions.model";
import Eq_camp_solutions from "@/models/eq_camp_solutions.model";
import { enquiryActor } from "@/lib/enquiries/completion-server";

interface IBody {
    camp_id: string,
    enquiry_id: string
};

export async function PUT(req:NextRequest){
    try{
        await connectDB();
        const actor = await enquiryActor();
        if (!actor) return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
        if (!actor.admin) return NextResponse.json({ message: "Only an administrator can match Facilities", status: 403 }, { status: 403 });
        const body: IBody = await req.json();
        if (!mongoose.isValidObjectId(body.camp_id)) return NextResponse.json({ message: "Provide a valid Facility ID" }, { status: 400 });

        const denied = await authorizeEnquiry(body.enquiry_id, "admin");
        if (denied) return denied;

        const result = await inTransaction(async dbSession => {
            const enquiry: any = await Eq_enquiry.findById(body.enquiry_id)
                .select("business_id camp_id createdBy enquiry_brought_by enquiry_uuid").session(dbSession);
            if (!enquiry) {
                return NextResponse.json({ message: "Enquiry not found", status: 404 }, { status: 404 });
            }

            const oldCampId = enquiry?.camp_id ? String(enquiry.camp_id) : "";
            const oldCamp = oldCampId ? await Eq_camps.findById(oldCampId).select("business_id camp_name is_active").session(dbSession) : null;
            const selectedCamp = await Eq_camps.findById(body.camp_id).select("camp_name").session(dbSession);

            if (!selectedCamp) {
                return NextResponse.json({ message: "Selected camp not found", status: 404 }, { status: 404 });
            }

            const requestedCampName = oldCamp?.camp_name || "Requested site";
            const existingCampName = selectedCamp?.camp_name || "Existing camp";
            const recipientIds = Array.from(new Set([
                enquiry?.createdBy ? String(enquiry.createdBy) : "",
                ...(Array.isArray(enquiry?.enquiry_brought_by) ? enquiry.enquiry_brought_by.map((id: any) => String(id)) : []),
            ].filter(Boolean)));

            if (recipientIds.length > 0) {
                const notificationTitle = "Camp Validation Update";
                const notificationBody = `The Site is previously visited + ${requestedCampName}`;
                const notificationData = {
                    type: "enquiry",
                    event: "camp-matched-existing",
                    enquiryId: String(enquiry._id),
                    enquiryUuid: enquiry?.enquiry_uuid || "",
                    requestedCampName,
                    existingCampName,
                };

                await enqueueNotifications(recipientIds.map(recipientId => ({
                    recipient_id: recipientId, sender_id: null, kind: "enquiry", title: notificationTitle,
                    body: notificationBody, data: notificationData, meta: notificationData, read_at: null,
                })), { notification: { title: notificationTitle, body: notificationBody }, data: notificationData },
                    `enquiry:${enquiry._id}:camp-matched:${body.camp_id}`, dbSession);
            }

            if (oldCamp && !oldCamp.is_active && oldCampId !== body.camp_id &&
                await canChangeEnquiryFacility(enquiry, oldCamp, actor, dbSession) &&
                !await Eq_enquiry.exists({ camp_id: oldCampId, _id: { $ne: enquiry._id } }).session(dbSession)) {
            await Eq_camps.findByIdAndDelete(oldCampId, { session: dbSession });
            await Eq_camp_solutions.deleteOne({ camp_id: oldCampId }, { session: dbSession });
            }

            await Eq_enquiry_wifi_external.deleteMany({ enquiry_id: body.enquiry_id }, { session: dbSession });
            await Eq_enquiry_wifi_personal.deleteMany({ enquiry_id: body.enquiry_id }, { session: dbSession });
            await Eq_enquiry_histories.deleteMany({ enquiry_id: body.enquiry_id }, { session: dbSession });
            await Eq_enquiry_access.deleteMany({ enquiry_id: body.enquiry_id }, { session: dbSession });
            await Eq_Enquiry_External_Wifi_Edit.deleteMany({ enquiry_id: body.enquiry_id }, { session: dbSession });
            await Eq_Enquiry_Personal_Wifi_Edit.deleteMany({ enquiry_id: body.enquiry_id }, { session: dbSession });
            await Eq_Enquiry_Edit.deleteMany({ enquiry_id: body.enquiry_id }, { session: dbSession });
            await Eq_camp_contacts.deleteMany({ enquiry_id: body.enquiry_id }, { session: dbSession });
            await Eq_enquiry_solutions.deleteOne({ enquiry_id: body.enquiry_id }, { session: dbSession });
            await Eq_enquiry.findByIdAndDelete(body.enquiry_id, { session: dbSession });

            return NextResponse.json({
                message:"Matched existing camp. Duplicate enquiry removed.",
                status: 200,
                notification: `The Site is previously visited + ${requestedCampName}`,
                removed_duplicate_enquiry: true
            }, {status: 200});
        });
        return result;
    }catch(err){
        console.log("Error while assigning camp to enquiry");
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
