import { enquiryActor } from "@/lib/enquiries/access";
import mongoose from "mongoose";
import connectDB from "@/lib/mongo";
import Eq_enquiry_users from "@/models/eq_enquiry_users.model";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req:NextRequest){
    try{
        await connectDB();
        const {searchParams} = new URL(req.url);
        const user_id = searchParams.get("user_id");
        const actor = await enquiryActor();
        if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        if (!mongoose.isValidObjectId(user_id)) return NextResponse.json({ message: "Provide a valid user ID" }, { status: 400 });
        const requestedBusiness = searchParams.get("business_id");
        const scope = actor.isSuper ? {} : { business_id: { $in: actor.adminBusinessIds || [] } };
        if (requestedBusiness && !actor.isSuper && !actor.adminBusinessIds?.includes(requestedBusiness)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        const query = { user_id, ...scope, ...(requestedBusiness ? { business_id: requestedBusiness } : {}) };
        const rows: any[] = await Eq_enquiry_users.find(query).select("_id").limit(2).lean();
        if (!rows.length) return NextResponse.json({ message: "Membership not found or not managed by you" }, { status: 403 });
        if (rows.length > 1 && !requestedBusiness) return NextResponse.json({ message: "Select a business before removing this membership" }, { status: 400 });
        await Eq_enquiry_users.deleteOne({ _id: rows[0]._id });

        return NextResponse.json({message:"Enquiry User deleted successfully", status: 200}, {status: 200});
    }catch(err){
        console.log("Error while deleting Enquiry Users: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500});
    }
}