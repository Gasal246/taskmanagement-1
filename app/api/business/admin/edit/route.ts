import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    _id?: string;
    admin_name?: string;
    admin_email?: string;
    admin_phone?: string;
    business_id?: string;
    [key: string]: any;
}

export async function POST (req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if(!session) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const formData = await req.formData();
        const { body } = Object.fromEntries(formData) as { body: string };
        const bodyData = await JSON.parse(body) as Body;
        console.log(bodyData);
        const edited_user = await Users.findByIdAndUpdate(bodyData?._id, {
            name: bodyData?.admin_name,
            email: bodyData?.admin_email,
            phone: bodyData?.admin_phone,
        }, { new: true});
        return Response.json({ data: edited_user, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
