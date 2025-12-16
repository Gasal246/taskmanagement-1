import connectDB from "@/lib/mongo";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import Area_heads from "@/models/area_heads.model";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session:any = await getServerSession(authOptions);
        if(!session) return NextResponse.json({message:"Unauthorized", status:401}, {status:401});

        const areas = await Area_heads.find({user_id: session?.user?.id}).populate("area_id");
        return NextResponse.json({areas, message:"Areas fetched successfully", status:200}, {status:200});
    }catch(err){
        console.log("Error while getting area details for heads: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}