import { authorizeUserProfile } from "@/lib/server-access";
import { enquiryActor, enquiryManagementFilter } from "@/lib/enquiries/access";
import connectDB from "@/lib/mongo";
import Eq_users_log from "@/models/eq_users_log.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest){
    try{
        await connectDB();
        const {searchParams} = new URL(req.url);
        const user_id = searchParams.get("user_id");
        if(!user_id) return NextResponse.json({message: "Please select user", status: 400}, {status:200});

        const denied = await authorizeUserProfile(user_id);
        if (denied) return denied;
        const actor = await enquiryActor();
        if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (actor.actorId !== user_id && !actor.admin) return NextResponse.json({ message: "An active administrator role is required" }, { status: 403 });
        const scope = actor.actorId === user_id ? {} : enquiryManagementFilter(actor);

        const Enquiries = (await import("@/models/eq_enquiries.model")).default;
        let user_logs: any[];
        if (actor.actorId === user_id || actor.isSuper) {
            user_logs = await Eq_users_log.find({ user_id }).populate({ path: "camp_id", select: "camp_name" }).sort({ createdAt: -1 }).lean();
        } else {
            user_logs = await Eq_users_log.aggregate([
                { $match: { user_id: new (await import("mongoose")).Types.ObjectId(user_id!) } },
                { $lookup: { from: Enquiries.collection.name, localField: "enquiry_id", foreignField: "_id", pipeline: [{ $match: scope }, { $project: { _id: 1 } }], as: "_visible" } },
                { $match: { "_visible.0": { $exists: true } } }, { $unset: "_visible" }, { $sort: { createdAt: -1 } },
            ]);
            await Eq_users_log.populate(user_logs, { path: "camp_id", select: "camp_name" });
        }

        const user_name = await Users.findById(user_id).select("name").lean();

        return NextResponse.json({user_logs, user_name, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting User logs: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}