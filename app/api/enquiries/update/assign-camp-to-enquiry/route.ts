import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    camp_id: string,
    enquiry_id: string
};

export async function PUT(req:NextRequest){
    try{
        const body: IBody = await req.json();

        const enquiry = await Eq_enquiry.findById(body.enquiry_id);
        const old_camp_id = enquiry?.camp_id;

        enquiry.camp_id = body.camp_id;

        await Eq_camps.findByIdAndDelete(old_camp_id);
        enquiry.is_active = true;
        await enquiry.save();

        return NextResponse.json({message:"Assigned Successfully", status: 200}, {status: 200});
    }catch(err){
        console.log("Error while assigning camp to enquiry");
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}