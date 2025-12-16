import connectDB from "@/lib/mongo";
import Region_departments from "@/models/region_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    dep_name: string;
    type: string;
    region_id: string;
}

export async function POST (req: NextRequest) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body) as Body;

        const department = await Region_departments.findOne({ region_id: body.region_id, dep_name: body.dep_name });
        if(department?.status === 0) {
            await Region_departments.findByIdAndUpdate(department?._id, { status: 1 });
            return NextResponse.json({ message: "Region department added successfully", status: 200 }, { status: 200 });
        }

        if(department) {
            return NextResponse.json({ error: "Region department already exists", status: 400 }, { status: 400 });
        }

        const newDepartment = new Region_departments({
            region_id: body.region_id,
            dep_name: body.dep_name,
            type: body.type,
        });
        await newDepartment.save();

        return NextResponse.json({ message: "Region department added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
