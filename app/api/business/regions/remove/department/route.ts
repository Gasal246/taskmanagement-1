import connectDB from "@/lib/mongo";
import Region_departments from "@/models/region_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { RegDepId:dep_id } = await req.json();
        console.log(dep_id);
        const department = await Region_departments.findById(dep_id);
        if(!department){
            return NextResponse.json({ error: "Department Not Found" }, { status: 404 });
        }

        await Region_departments.findByIdAndUpdate(dep_id, { status: 0 });
        return NextResponse.json({ message: "Department removed successfully", status: 200 }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
