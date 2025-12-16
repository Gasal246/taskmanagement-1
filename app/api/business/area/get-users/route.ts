import connectDB from "@/lib/mongo";
import Area_heads from "@/models/area_heads.model";
import Area_staffs from "@/models/area_staffs.model";
import "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const ids = searchParams.get("area_ids");
        const area_ids: any[] = ids?.split(",") || [];

        if (area_ids?.length <= 0) {
            return NextResponse.json({ error: "Area IDs are required" }, { status: 400 });
        }

        let staffData = await Area_staffs.find({ area_id: { $in: area_ids }, status: 1 })
            .populate({
                path: "staff_id",
                select: { password: 0 }
            }).lean();
        staffData = staffData.map(item => ({
            ...item,
            user_id: item.staff_id,
            staff_id: undefined
        }));

        const headData = await Area_heads.find({ area_id: { $in: area_ids }, status: 1 }).populate({
            path: "user_id",
            select: { password: 0 }
        })
        console.log("staff data: ", staffData);
        console.log("headData: ", headData);


        return NextResponse.json({ data: [ ...staffData, ...headData ], status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
