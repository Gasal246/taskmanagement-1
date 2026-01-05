import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Roles from "@/models/roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    role_number: number;
    role_name: string;
}

export async function POST (req: NextRequest) {
    try {
        console.log("Add Role API Called");
        const session: any = await auth();
        if (!session) {
            return new NextResponse("Authorisation Error", { status: 401 })
        }
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;
        const newRole = new Roles({
            role_number: body.role_number,
            role_name: body.role_name,
        });
        const savedRole = await newRole.save();
        return Response.json({ status: 200, data: savedRole });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}