import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { compare, hash } from "bcrypt-ts";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    is_password: boolean,
    name?: string | null,
    avatar_url?: string | null,
    old_password?: string | null,
    new_password?: string | null
}

export async function PUT(req:NextRequest){
    try{
        const session:any = await auth();
        if(!session) return NextResponse.json({message: "Un-Authorized Access", status: 401}, {status: 401});

        const body:Body = await req.json();
        const user = await Users.findById(session?.user?.id);
        if(!user) return NextResponse.json({message: "User not found", status: 404}, {status: 404});

        if(body.is_password){
            if(!body.old_password || !body.new_password) return NextResponse.json({message: "Please Provide old and new passwords", status: 400}, {status: 400});

            const isValid = await compare(body.old_password, user?.password);
            if(!isValid) return NextResponse.json({message: "Incorrect Old Password", status: 401}, {status: 401});
            user.password = await hash(body.new_password, 10);
            await user.save();
            return NextResponse.json({message: "Password Updated", status: 201}, {status: 201});
        } else {
            let hasUpdate = false;
            if(typeof body.name === "string" && body.name.trim()){
                user.name = body.name.trim();
                hasUpdate = true;
            }
            if(typeof body.avatar_url === "string" && body.avatar_url.trim()){
                user.avatar_url = body.avatar_url.trim();
                hasUpdate = true;
            }
            if(!hasUpdate){
                return NextResponse.json({message: "No profile updates provided", status: 400}, {status: 400});
            }
            await user.save();
            return NextResponse.json({message: "Profile Updated", status: 201}, {status: 201});
        }
    }catch(err){
        console.log("Error while updating Staff Profile: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}

export const dynamic = "force-dynamic";
