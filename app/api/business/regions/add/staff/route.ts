import connectDB from "@/lib/mongo";
import Region_staffs from "@/models/region_staffs.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    region_id: string;
    user_id: string;
    business_id: string;
}

export async function POST (req: NextRequest) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body);

        console.log(body)

        const reg_staff = await Region_staffs.findOne({ region_id: body.region_id, staff_id: body.user_id });
        if(reg_staff?.status === 0) {
            await Region_staffs.findByIdAndUpdate(reg_staff?._id, { status: 1 });
            return NextResponse.json({ message: "Region staff added successfully", status: 200 }, { status: 200 });
        }
        
        if(reg_staff) {
            return NextResponse.json({ error: "Region staff already exists", status: 400 }, { status: 400 });
        }

        const newRegStaff = new Region_staffs({
            region_id: body.region_id,
            staff_id: body.user_id,
        });
        await newRegStaff.save();

        return NextResponse.json({ message: "Region staff added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
