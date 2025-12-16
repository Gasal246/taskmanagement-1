import connectDB from "@/lib/mongo";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const agent_id = searchParams.get("agent_id");

        const agent = await Users.findById(agent_id).select("name email phone status").lean();
        const enquiries = await Eq_enquiry.find({createdBy: agent_id}).populate("camp_id");

        return NextResponse.json({agent, enquiries, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting Agent by ID: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}