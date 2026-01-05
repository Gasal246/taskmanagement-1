import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business from "@/models/business.model";
import { NextResponse } from "next/server";
connectDB();

export async function GET () {
    try {
        const session = await auth();
        if(!session){
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const businesses = await Business.find({ status: 1 });
        return Response.json({ data: businesses, status: 200 });
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
