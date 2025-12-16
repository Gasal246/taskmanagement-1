import connectDB from "@/lib/mongo";
import Business_regions from "@/models/business_regions.model";
import User_regions from "@/models/user_regions.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    region_id: string;
    [key: string]: any;
}

export async function POST (req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body);

        const user = await Users.findOne({ _id: body.user_id });
        if(!user){
            return NextResponse.json({ error: "User Not Found" }, { status: 404 });
        }

        const region = await Business_regions.findOne({ _id: body.region_id, status: 1 });
        if(!region){
            return NextResponse.json({ error: "Region Not Found" }, { status: 404 });
        }

        const userRegion = new User_regions({
            user_id: body.user_id,
            region_id: body.region_id,
        });
        await userRegion.save();

        return NextResponse.json({ message: "Region added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

