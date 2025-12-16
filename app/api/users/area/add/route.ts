import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import Business_areas from "@/models/business_areas.model";
import User_areas from "@/models/user_areas.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    area_id: string;
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

        const area = await Business_areas.findOne({ _id: body.area_id, status: 1 });
        if(!area){
            return NextResponse.json({ error: "Area Not Found" }, { status: 404 });
        }

        const userArea = await User_areas.findOne({ user_id: body.user_id, area_id: body.area_id });
        if(userArea?.status === 0){
            await User_areas?.findByIdAndUpdate(userArea._id, { status: 1 });
            return NextResponse.json({ message: "Area added successfully", status: 200 }, { status: 200 });
        }
        if(userArea){
            return NextResponse.json({ error: "Area Already Added" }, { status: 400 });
        }

        const newUserArea = new User_areas({
            user_id: body.user_id,
            area_id: body.area_id,
        });
        await newUserArea.save();

        return NextResponse.json({ message: "Area added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
