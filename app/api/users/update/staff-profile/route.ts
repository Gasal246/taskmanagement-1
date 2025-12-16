import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { compare, hash } from "bcrypt-ts";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    is_password: boolean,
    name: string | null,
    old_password: string | null,
    new_password: string | null
}

export async function PUT(req:NextRequest){
    try{
        const session:any = await getServerSession(authOptions);
        if(!session) return NextResponse.json({message: "Un-Authorized Access", status: 401}, {status: 401});

        const body:Body = await req.json();
        const user = await Users.findById(session?.user?.id).select("password");

        if(body.is_password){
            if(!body.old_password || !body.new_password) return NextResponse.json({message: "Please Provide old and new passwords", status: 400}, {status: 400});

            const isValid = await compare(body.old_password, user?.password);
            if(!isValid) return NextResponse.json({message: "Incorrect Old Password", status: 401}, {status: 401});
            user.password = await hash(body.new_password, 10);
            await user.save();
            return NextResponse.json({message: "Password Updated", status: 201}, {status: 201});
        } else {
            user.name = body.name;
            await user.save();
            return NextResponse.json({message: "Profile Updated", status: 201}, {status: 201});
        }
    }catch(err){
        console.log("Error while updating Staff Profile: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}

export const dynamic = "force-dynamic";