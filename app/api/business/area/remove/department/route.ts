import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { AreaDepId } = await req.json();

        const area_dep = await Area_departments.findById(AreaDepId);
        if(!area_dep){
            return NextResponse.json({ error: "Area Department Not Found" }, { status: 404 });
        }

        await Area_departments.findByIdAndUpdate(AreaDepId, { status: 0 });
        return NextResponse.json({ message: "Area Department removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
