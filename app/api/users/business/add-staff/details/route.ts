import connectDB from "@/lib/mongo";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    skills: string;
    docs: [
        {
            doc_name: string;
            doc_url: string;
        }
    ]
    avatar_url: string;
    roles: string[]; // role_names []
}

export async function POST (req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body);

        
        
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}