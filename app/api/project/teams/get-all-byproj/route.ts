import connectDB from "@/lib/mongo";
import { NextRequest } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        
    }catch(err){
        console.log("error while getting teams: ", err);
        
    }
}