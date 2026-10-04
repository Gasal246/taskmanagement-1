import { enquiryActor, resolveEnquiryCreationBusiness } from "@/lib/enquiries/access";
import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import { NextRequest, NextResponse } from "next/server";

interface Body {
    business_id?: string,
    area_name: string,
    country: string,
    region: string,
    province: string,
    city: string
}


export async function POST(req:NextRequest){
    try{
        await connectDB();
        const body: Body = await req.json();

        const actor = await enquiryActor();
        if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        const businessId = await resolveEnquiryCreationBusiness(req, actor, body.business_id);
        if (!actor.admin || !businessId) return NextResponse.json({ message: "Select a business you administer" }, { status: 403 });
        const newArea = new Eq_area({
            business_id: businessId,
            country_id: body.country,
            region_id: body.region,
            province_id: body.province,
            city_id: body.city,
            area_name: body.area_name,
            is_active: true
        });
        await newArea.save();
        return NextResponse.json({message: "New Area Created", status: 201}, {status: 201});
    }catch(err){
        console.log("Error while adding new area: ", err);
        return NextResponse.json({message:"Internal server error", status: 500}, {status:500});
    }
}