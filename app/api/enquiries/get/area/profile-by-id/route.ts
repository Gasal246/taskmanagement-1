import { enquiryLocationScope } from "@/lib/enquiries/location-scope";
import { countReadableEnquiries, enquiryActor } from "@/lib/enquiries/access";
import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest){
    try{
        await connectDB();
        const scope = await enquiryLocationScope(req);
        if (scope instanceof NextResponse) return scope;
        const actor = await enquiryActor();
        if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        const {searchParams} = new URL(req.url);
        const area_id = searchParams.get("area_id");

        const area = await Eq_area.findOne({ _id: area_id, ...scope.filter })
            .populate("country_id")
            .populate("region_id")
            .populate("province_id")
            .populate("city_id")
            .lean();

        const eq_count = await countReadableEnquiries({ area_id }, actor);

        return NextResponse.json({area, eq_count, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting area profile: ", err);
        return NextResponse.json({message: "Internal Server Error",  status: 500}, {status: 500})
    }
}