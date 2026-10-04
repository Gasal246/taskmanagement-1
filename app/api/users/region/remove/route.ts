import { authorizeOrganizationMutation } from "@/lib/organization-access";
import connectDB from "@/lib/mongo";
import User_regions from "@/models/user_regions.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST (req: NextRequest) {
    try {
        await connectDB();
        const denied = await authorizeOrganizationMutation(req);
        if (denied) return denied;
        const { URegId } = await req.json();

        const userRegion = await User_regions.findById(URegId);
        if(!userRegion){
            return NextResponse.json({ error: "User Region Not Found" }, { status: 404 });
        }

        await User_regions.findByIdAndUpdate(URegId, { status: 0 });

        return NextResponse.json({ message: "User Region Removed Successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

