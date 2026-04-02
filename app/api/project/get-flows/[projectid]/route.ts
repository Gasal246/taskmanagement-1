import connectDB from "@/lib/mongo";
import Flow_Log from "@/models/Flow_Log.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest, context: { params: Promise<{projectid:string}> }){
    try{
        const { projectid } = await context.params;
        const flows = await Flow_Log.find({project_id:projectid}).sort({createdAt: -1});
        return NextResponse.json({data:flows, status: 200}, {status:200});
    }catch(err){
        console.log("error while fetching flow: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500});
    }
}
