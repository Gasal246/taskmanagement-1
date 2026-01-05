import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Admin_assign_business from "@/models/admin_assign_business.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const session = await auth();
        if(!session){
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const formData = await req.formData();
        const { body } = Object.fromEntries(formData) as { body: string };
        console.log(body);
        const bodyData = await JSON.parse(body) as { object_id: string };
        console.log("BODY DATA", bodyData);
        const edited = await Admin_assign_business.findByIdAndDelete(bodyData?.object_id);
        return Response.json({ data: edited, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
