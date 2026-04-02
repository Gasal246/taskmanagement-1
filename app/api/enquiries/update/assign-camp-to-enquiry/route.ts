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
import Notifications from "@/models/notifications.model";
import FcmTokens from "@/models/fcm_tokens.model";
import { getAdminMessaging } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    camp_id: string,
    enquiry_id: string
};

export async function PUT(req:NextRequest){
    try{
        const body: IBody = await req.json();

        const enquiry: any = await Eq_enquiry.findById(body.enquiry_id)
            .select("camp_id createdBy enquiry_brought_by enquiry_uuid");
        if (!enquiry) {
            return NextResponse.json({ message: "Enquiry not found", status: 404 }, { status: 404 });
        }

        const oldCampId = enquiry?.camp_id ? String(enquiry.camp_id) : "";
        const [oldCamp, selectedCamp] = await Promise.all([
            oldCampId ? Eq_camps.findById(oldCampId).select("camp_name is_active") : null,
            Eq_camps.findById(body.camp_id).select("camp_name"),
        ]);

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

            await Notifications.insertMany(
                recipientIds.map((recipientId) => ({
                    recipient_id: recipientId,
                    sender_id: null,
                    kind: "enquiry",
                    title: notificationTitle,
                    body: notificationBody,
                    data: notificationData,
                    meta: notificationData,
                    read_at: null,
                }))
            );

            try {
                const tokenDocs = await FcmTokens.find(
                    { user_id: { $in: recipientIds } },
                    { token: 1 }
                ).lean();
                const tokens = tokenDocs.map((doc: any) => doc?.token).filter(Boolean);
                if (tokens.length > 0) {
                    const messaging = getAdminMessaging();
                    const response = await messaging.sendEachForMulticast({
                        tokens,
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        data: Object.fromEntries(
                            Object.entries(notificationData).map(([key, value]) => [key, String(value)])
                        ),
                    });
                    const invalidTokens = response.responses
                        .map((res, index) => {
                            const code = res.error?.code || "";
                            if (
                                code === "messaging/registration-token-not-registered" ||
                                code === "messaging/invalid-registration-token"
                            ) {
                                return tokens[index];
                            }
                            return null;
                        })
                        .filter(Boolean) as string[];
                    if (invalidTokens.length > 0) {
                        await FcmTokens.deleteMany({ token: { $in: invalidTokens } });
                    }
                }
            } catch (pushError) {
                console.log("Failed to send camp-match notification", pushError);
            }
        }

        if (oldCampId && oldCampId !== body.camp_id) {
            await Eq_camps.findByIdAndDelete(oldCampId);
        }

        await Promise.all([
            Eq_enquiry_wifi_external.deleteMany({ enquiry_id: body.enquiry_id }),
            Eq_enquiry_wifi_personal.deleteMany({ enquiry_id: body.enquiry_id }),
            Eq_enquiry_histories.deleteMany({ enquiry_id: body.enquiry_id }),
            Eq_enquiry_access.deleteMany({ enquiry_id: body.enquiry_id }),
            Eq_Enquiry_External_Wifi_Edit.deleteMany({ enquiry_id: body.enquiry_id }),
            Eq_Enquiry_Personal_Wifi_Edit.deleteMany({ enquiry_id: body.enquiry_id }),
            Eq_Enquiry_Edit.deleteMany({ enquiry_id: body.enquiry_id }),
            Eq_camp_contacts.deleteMany({ enquiry_id: body.enquiry_id }),
            Eq_enquiry.findByIdAndDelete(body.enquiry_id),
        ]);

        return NextResponse.json({
            message:"Matched existing camp. Duplicate enquiry removed.",
            status: 200,
            notification: `The Site is previously visited + ${requestedCampName}`,
            removed_duplicate_enquiry: true
        }, {status: 200});
    }catch(err){
        console.log("Error while assigning camp to enquiry");
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
