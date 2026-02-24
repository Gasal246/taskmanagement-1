import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Eq_users_log from "@/models/eq_users_log.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { notifyEnquiryForward } from "@/app/api/helpers/enquiry-notifications";

connectDB();

interface Body {
    enquiry_id: string,
    access_users: string[],
    assigned_to: string | string[],
    priority: number,
    action: string,
    feedback: string,
    is_finished: boolean,
    next_date: Date
}

export async function POST(req: NextRequest) {
    try {
        const session: any = await auth();
        if(!session) return NextResponse.json({message:"Unauthorized Access", status: 401}, {status: 401});

        const user = await Users.findById(session?.user?.id);

        const body: Body = await req.json();
        console.log("body: ", body);
        
        if (!Array.isArray(body.access_users)) {
            body.access_users = [];
        }
        const assignedToList = Array.isArray(body.assigned_to)
            ? body.assigned_to
            : body.assigned_to
                ? [body.assigned_to]
                : [];

        const ogEnq:any = await Eq_enquiry.findById(body.enquiry_id);

        const camp:any = await Eq_camps.findById(ogEnq.camp_id).select("camp_name").lean();

        const existingEnq: any = await Eq_enquiry_histories
            .findOne({ enquiry_id: body.enquiry_id })
            .sort({ step_number: -1 })   // highest step_number first
            .lean();

        const newHistory = new Eq_enquiry_histories({
            camp_id: existingEnq.camp_id,
            enquiry_id: existingEnq.enquiry_id,
            assigned_to: assignedToList,
            step_number: ++existingEnq.step_number,
            priority: body.priority,
            is_finished: body.is_finished,
            action: body.action,
            feedback: body.feedback,
            next_step_date: body.next_date
        });

        const savedHistory = await newHistory.save();

        const newAccess: any = [];
        body.access_users.push(...assignedToList);
        body.access_users.push(session?.user?.id);

        const uniqueAccess = Array.from(new Set(body.access_users.filter(Boolean)));

        uniqueAccess.forEach(x => {
            const singleAccess = {
                history_id: savedHistory._id,
                enquiry_id: savedHistory.enquiry_id,
                camp_id: savedHistory.camp_id,
                user_id: x
            };
            newAccess.push(singleAccess);
        })

        await Eq_enquiry_access.insertMany(newAccess);

        if (user?._id) {
            await notifyEnquiryForward({
                req,
                recipientIds: uniqueAccess.map((id) => String(id)),
                enquiryId: savedHistory.enquiry_id,
                action: body.action,
                priority: body.priority,
                actorId: String(user._id),
                actorName: user?.name || "User",
            });
        }

        if (body.is_finished) {
            console.log("FINISHED: ", body.enquiry_id);
            ogEnq.status = "Closed";
        };

        const allPriorities = await Eq_enquiry_histories.find({enquiry_id: body.enquiry_id}).select("priority");
        const priorArray = allPriorities?.map((p)=> p.priority);
        const avg = Math.round(priorArray?.reduce((sum, value)=> sum + value, 0) / priorArray.length);
        console.log("average priority: ", avg);
        ogEnq.priority = avg;
        await ogEnq.save();

        switch(existingEnq?.action){
            case "Visit": {
                    const newLog = new Eq_users_log({
                    user_id: session?.user?.id,
                    camp_id: ogEnq?.camp_id,
                    enquiry_id: body.enquiry_id,
                    log: `${user?.name} Visitted ${camp?.camp_name}`
                });
                await newLog.save();
                break;
            }
            case "Call": {
                const newLog = new Eq_users_log({
                    user_id: session?.user?.id,
                    camp_id: ogEnq?.camp_id,
                    enquiry_id: body.enquiry_id,
                    log: `${user?.name} Called ${camp?.camp_name}`
                });
                await newLog.save();
                break;
            }
        }
        return NextResponse.json({ message: "Enquiry Forwarded", status: 201 }, { status: 201 });
    } catch (err) {
        console.log("Error while forwarding enquiry: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 })
    }
}
