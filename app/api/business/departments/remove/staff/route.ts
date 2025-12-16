import connectDB from "@/lib/mongo";
import Dep_staffs from "@/models/department_staffs.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { DepStaffId } = await req.json();
        const dep_staff = await Dep_staffs.findById(DepStaffId);
        if(!dep_staff){
            return NextResponse.json({ error: "Department Staff Not Found" }, { status: 404 });
        }
        await Dep_staffs.findByIdAndUpdate(DepStaffId, { status: 0 });
        return NextResponse.json({ message: "Department Staff Deleted Successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
