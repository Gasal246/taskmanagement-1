import connectDB from "@/lib/mongo";
import Business_staffs from "@/models/business_staffs.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const staff_id = searchParams.get("staff_id");
        const business_id = searchParams.get("business_id");

        if (!staff_id || !business_id) {
            return NextResponse.json({ message: "Staff id and business id are required", status: 400 }, { status: 400 });
        }

        const staffRecord = await Business_staffs.findOne({ user_id: staff_id, business_id });
        if (!staffRecord) {
            return NextResponse.json({ message: "Staff not found", status: 404 }, { status: 404 });
        }

        await Business_staffs.deleteOne({ _id: staffRecord._id });
        await User_roles.updateMany({ user_id: staff_id, business_id }, { status: 0 });

        return NextResponse.json({ message: "Staff deleted successfully", status: 200 }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
