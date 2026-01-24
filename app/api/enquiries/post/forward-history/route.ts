import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import { NextRequest, NextResponse } from "next/server";

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
        if(!session) return NextResponse.json({message: "Unauthorized Access", status: 401}, {status: 401});

        const body: Body = await req.json();

        if (!Array.isArray(body.access_users)) {
            body.access_users = [];
        }
        const assignedToList = Array.isArray(body.assigned_to)
            ? body.assigned_to
            : body.assigned_to
                ? [body.assigned_to]
                : [];

        const ogEnq:any = await Eq_enquiry.findById(body.enquiry_id);

        const existingEnq: any = await Eq_enquiry_histories
            .findOne({ enquiry_id: body.enquiry_id })
            .sort({ step_number: -1 })   // highest step_number first
            .lean();

        if (!existingEnq) {
            const campId = await Eq_enquiry.findById(body.enquiry_id).select("camp_id");

            const newHistory = new Eq_enquiry_histories({
                camp_id: campId.camp_id,
                enquiry_id: body.enquiry_id,
                assigned_to: assignedToList,
                step_number: 1,
                priority: body.priority,
                action: body.action,
                feedback: body.feedback,
                next_step_date: body.next_date,
                forwarded_by: session?.user?.id
            });

            const savedHistory = await newHistory.save();

            body.access_users.push(...assignedToList);
            if (body.access_users.length > 0) {
                const uniqueAccess = Array.from(new Set(body.access_users.filter(Boolean)));
                const newAccess = uniqueAccess.map((x) => ({
                    history_id: savedHistory._id,
                    enquiry_id: body.enquiry_id,
                    camp_id: campId.camp_id,
                    user_id: x,
                }));

                await Eq_enquiry_access.insertMany(newAccess);
            }

            if (body.is_finished) {
                // await Eq_enquiry.updateOne({ _id: body.enquiry_id }, { $set: { status: "Closed" } })
                ogEnq.status == "Closed";
            };
            
            ogEnq.priority = body.priority;
            await ogEnq.save();

            return NextResponse.json({ message: "Enquiry Forwarded", status: 201 }, { status: 201 });
        }

        const newHistory = new Eq_enquiry_histories({
            camp_id: existingEnq.camp_id,
            enquiry_id: existingEnq.enquiry_id,
            assigned_to: assignedToList,
            step_number: ++existingEnq.step_number,
            priority: body.priority,
            is_finished: body.is_finished,
            action: body.action,
            feedback: body.feedback,
            next_step_date: body.next_date,
            forwarded_by: session?.user?.id
        });

        const savedHistory = await newHistory.save();

        const newAccess: any = [];
        body.access_users.push(...assignedToList);

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

        return NextResponse.json({ message: "Enquiry Forwarded", status: 201 }, { status: 201 });

    } catch (err) {
        console.log("Error while forwarding enquiry: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 })
    }
}
