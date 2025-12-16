import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    area_id: string,
    area_name: string
}

export async function PUT(req:NextRequest){
    try{
        const body:IBody = await req.json();
        if(!body.area_id) return NextResponse.json({message: "Please pass area_id", status: 400}, {status: 400})
        
        const toUpdate = await Eq_area.findByIdAndUpdate(body.area_id, {$set: {
            area_name: body.area_name,
            is_active: true
        }});
        return NextResponse.json({message: "Area Updated Successfully", status: 200}, {status: 200});
    }catch(err){
        console.log("Error while updating the Camp: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}