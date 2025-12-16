import connectDB from "@/lib/mongo";
import Business_departments from "@/models/business_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    dep_name: string;
    BDepId: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const editedDep = await Business_departments.findByIdAndUpdate(body?.BDepId, {
            dep_name: body?.dep_name,
        }, { new: true });
        return NextResponse.json({ data: editedDep, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
