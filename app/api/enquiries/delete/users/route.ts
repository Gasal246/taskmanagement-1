import connectDB from "@/lib/mongo";
import Eq_enquiry_users from "@/models/eq_enquiry_users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const user_id = searchParams.get("user_id");
        console.log("userId: ", user_id);
        
        if(!user_id) return NextResponse.json({message: "Please select the user to delete", status: 203}, {status: 203})
        await Eq_enquiry_users.deleteOne({user_id: user_id});

        return NextResponse.json({message:"Enquiry User deleted successfully", status: 200}, {status: 200});
    }catch(err){
        console.log("Error while deleting Enquiry Users: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500});
    }
}