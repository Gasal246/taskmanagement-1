import connectDB from "@/lib/mongo";
import User_docs from "@/models/user_docs.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const { UDocId } = await req.json();

        const userDoc = await User_docs.findById(UDocId);
        if(!userDoc){
            return NextResponse.json({ error: "Document Not Found" }, { status: 404 });
        }

        await User_docs.findByIdAndDelete(UDocId);

        return NextResponse.json({ message: "Document removed successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
    
export const dynamic = "force-dynamic";

