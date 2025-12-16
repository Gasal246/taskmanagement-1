import connectDB from "@/lib/mongo";
import Department_areas from "@/models/department_areas.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { DepAreaId } = await req.json();

        const area = await Department_areas.findById(DepAreaId);
        if(!area){
            return NextResponse.json({ error: "Area Not Found" }, { status: 404 });
        }

        await Department_areas.findByIdAndUpdate(DepAreaId, { status: 0 });
        return NextResponse.json({ message: "Area Removed Successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
