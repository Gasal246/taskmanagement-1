import connectDB from "@/lib/mongo";
import Department_heads from "@/models/department_heads.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { DepHeadId } = await req.json();
        
        const depHead = await Department_heads.findById(DepHeadId);
        if(!depHead){
            return NextResponse.json({ error: "Department Head Not Found" }, { status: 404 });
        }
        
        await Department_heads.findByIdAndUpdate(DepHeadId, { status: 0 });
        return NextResponse.json({ message: "Department Head removed successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 }); 
    }
}

export const dynamic = "force-dynamic";
