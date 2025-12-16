import connectDB from "@/lib/mongo";
import User_docs from "@/models/user_docs.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    doc_name: string;
    doc_url: string;
    expire_date: Date;
    doc_type?: string;
    storage_path?: string;
}

export async function POST (req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body);

        const user = await Users.findOne({ _id: body.user_id });
        if(!user){
            return NextResponse.json({ error: "User Not Found" }, { status: 404 });
        }

        const doc = await User_docs.findOne({ user_id: body.user_id, doc_name: body.doc_name });
        if(doc){
            await User_docs?.findByIdAndDelete(doc._id);
        }

        const newUserDoc = new User_docs({
            user_id: body.user_id,
            doc_name: body.doc_name,
            doc_url: body.doc_url,
            expire_date: body.expire_date,
            doc_type: body.doc_type,
            storage_path: body.storage_path,
            status: 1,
        });
        await newUserDoc.save();

        return NextResponse.json({ message: "Document added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
