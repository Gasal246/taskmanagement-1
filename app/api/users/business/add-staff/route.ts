import connectDB from "@/lib/mongo";
import Business_staffs from "@/models/business_staffs.model";
import User_details from "@/models/user_details.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    name: string;
    email: string;
    phone: string;
    country: string;
    province: string;
    city: string;
    dob: string;
    gender: string;
    business_id: string;
    [key: string]: string;
}

export async function POST (req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const user = await Users.findOne({ email: body.email });
        if(user){
            return NextResponse.json({ error: "User already exists", status: 400 }, { status: 400 });
        }

        const newUser = new Users({
            name: body.name,
            email: body.email,
            phone: body.phone,
        });
        const savedUser = await newUser.save();
        const newUserDetails = new User_details({
            user_id: savedUser._id,
            country: body.country,
            province: body.province,
            city: body.city,
            dob: body.dob,
            gender: body.gender,
        });
        await newUserDetails.save();

        const newBusinessStaff = new Business_staffs({
            user_id: savedUser._id,
            business_id: body.business_id,
        });
        await newBusinessStaff.save();

        return NextResponse.json({ message: "User added successfully", status: 200, data: savedUser }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

