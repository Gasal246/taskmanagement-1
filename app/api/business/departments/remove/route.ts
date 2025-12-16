import connectDB from "@/lib/mongo";
import Business_departments from "@/models/business_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { BDepId } = await req.json();
        const deletedDep = await Business_departments.findOne({ _id: BDepId, status: 1 });
        if(!deletedDep){
            return NextResponse.json({ error: "Department Not Found" }, { status: 404 });
        }
        await Business_departments.findByIdAndUpdate(BDepId, { status: 0 });
        return NextResponse.json({ message: "Department removed successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
