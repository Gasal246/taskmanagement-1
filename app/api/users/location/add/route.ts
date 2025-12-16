import connectDB from "@/lib/mongo";
import Business_locations from "@/models/business_locations.model";
import User_locations from "@/models/user_locations.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    location_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body: Body = JSON.parse(bodyData?.body);

        const user = await Users.findOne({ _id: body.user_id });
        if(!user){
            return NextResponse.json({ error: "User Not Found" }, { status: 404 });
        }

        const location = await Business_locations.findOne({ _id: body.location_id, status: 1 });
        if(!location){
            return NextResponse.json({ error: "Location Not Found" }, { status: 404 });
        }

        const userLocation = await User_locations.findOne({ user_id: body.user_id, location_id: body.location_id });
        if(userLocation?.status === 0){
            await User_locations?.findByIdAndUpdate(userLocation._id, { status: 1 });
            return NextResponse.json({ message: "Location added successfully", status: 200 }, { status: 200 });
        }
        if(userLocation){
            return NextResponse.json({ error: "Location Already Added" }, { status: 400 });
        }

        const newUserLocation = new User_locations({
            user_id: body.user_id,
            location_id: body.location_id,
        });
        await newUserLocation.save();

        return NextResponse.json({ message: "Location added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

