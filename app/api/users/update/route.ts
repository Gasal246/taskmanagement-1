import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import User_details from "@/models/user_details.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const session:any = await auth();
        if(!session) return NextResponse.json({message: "Un-Authorized Access", status: 401}, {status: 401});

        const contentType = req.headers.get("content-type") || "";
        let body: any = {};

        if (contentType.includes("application/json")) {
            body = await req.json();
        } else {
            const formdata = await req.formData();
            const rawBody = formdata.get("body");
            if (typeof rawBody !== "string") {
                return NextResponse.json({ message: "Invalid payload", status: 400 }, { status: 400 });
            }
            body = JSON.parse(rawBody);
        }

        if(!body?.user_id) return NextResponse.json({message: "User ID is required", status: 400}, {status: 400});

        const user = await Users.findById(body?.user_id);
        if(!user) return NextResponse.json({message: "User Not Found", status: 404}, {status: 404});

        const userUpdate: any = {};
        if (body.name !== undefined) userUpdate.name = body.name;
        if (body.email !== undefined) userUpdate.email = body.email;
        if (body.phone !== undefined) userUpdate.phone = body.phone;

        if (Object.keys(userUpdate).length) {
            await Users.findByIdAndUpdate(body?.user_id, userUpdate, { new: true });
        }

        const detailsUpdate: any = {};
        if (body.country !== undefined) detailsUpdate.country = body.country;
        if (body.province !== undefined) detailsUpdate.province = body.province;
        if (body.city !== undefined) detailsUpdate.city = body.city;
        if (body.dob !== undefined) detailsUpdate.dob = body.dob;
        if (body.gender !== undefined) detailsUpdate.gender = body.gender;

        if (Object.keys(detailsUpdate).length) {
            detailsUpdate.user_id = body?.user_id;
            await User_details.findOneAndUpdate(
                { user_id: body?.user_id },
                detailsUpdate,
                { new: true, upsert: true }
            );
        }

        return NextResponse.json({message: "Profile Updated", status: 201}, {status: 201});
    } catch (error: any) {
        console.log("Error while updating User Profile: ", error);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}

export const dynamic = "force-dynamic";
