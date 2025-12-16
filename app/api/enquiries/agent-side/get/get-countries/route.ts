import connectDB from "@/lib/mongo";
import Eq_Countries from "@/models/eq_countries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const countries = await Eq_Countries.find().sort({country_name: 1}).select("country_name");
        return NextResponse.json({countries, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting country list: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}