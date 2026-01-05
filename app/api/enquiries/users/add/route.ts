import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_enquiry_users from "@/models/eq_enquiry_users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    user_id: string,
    business_id: string,
    addedBy: string
}

export async function POST(req: NextRequest){
    try{
        const session: any = await auth();
        if(!session) return NextResponse.json({message: "Unauthorized Access", status: 401}, {status: 401});
        const body: IBody = await req.json();
        if(!body.business_id || !body.user_id) return NextResponse.json({message:"Please fill all fields", status: 400}, {status: 400});

        const newUser = new Eq_enquiry_users({
            user_id: body.user_id,
            business_id: body.business_id,
            addedBy: session?.user?.id
        });

        await newUser.save();

        return NextResponse.json({message: "User Added", status: 201}, {status: 201});

    }catch(err){
        console.log("Error while adding Enquiry Users: ", err);
        return NextResponse.json({message:"internal Server Error", status: 500}, {status: 500});
    }
}