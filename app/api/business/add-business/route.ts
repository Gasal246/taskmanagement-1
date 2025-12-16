import connectDB from "@/lib/mongo";
import Business from "@/models/business.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    business_name: string;
    business_email: string;
    business_country: string;
    business_province: string;
    business_city: string;
    business_phone: string;
    business_pin: string;
    [key: string]: any;
};

export async function POST (req: NextRequest) {
    try {
        const formData = await req.formData();
        const { body } = Object.fromEntries(formData) as { body: string };
        const bodyData = await JSON.parse(body) as Body;

        await Business.findOne({ email: bodyData?.business_email }).then((data: any) => {
            if(data){
                return Response.json({ status: 302, message: "Business Already Exists." })
            }
        });

        const newBusiness = new Business({
            business_name: bodyData?.business_name,
            business_email: bodyData?.business_email,
            business_country: bodyData?.business_country,
            business_province: bodyData?.business_province,
            business_city: bodyData?.business_city,
            business_phone: bodyData?.business_phone,
            business_pin: bodyData?.business_pin,
        });
        const savedBusiness = await newBusiness.save();
        return Response.json({ data: savedBusiness, status: 200 });
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
};

export const dynamic = "force-dynamic";

