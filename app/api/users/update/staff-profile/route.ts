import { auth } from "@/auth";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { compare, hash } from "bcrypt-ts";
import { NextRequest, NextResponse } from "next/server";

interface Body {
    is_password: boolean,
    name?: string | null,
    avatar_url?: string | null,
    old_password?: string | null,
    new_password?: string | null
}

export async function PUT(req:NextRequest){
    try{
        await connectDB();
        const session:any = await auth();
        if(!session) return NextResponse.json({message: "Un-Authorized Access", status: 401}, {status: 401});

        const body:Body = await req.json();
        const user = await Users.findOne({ _id: session.user.id, status: 1 }).select("+password");
        if(!user) return NextResponse.json({message: "User not found", status: 404}, {status: 404});

        if(body.is_password){
            if(!body.old_password || !body.new_password) return NextResponse.json({message: "Please Provide old and new passwords", status: 400}, {status: 400});

            if (typeof body.new_password !== "string" || body.new_password.length < 8 || body.new_password.length > 64 || Buffer.byteLength(body.new_password, "utf8") > 72) return NextResponse.json({ message: "Use an 8–64 character password", status: 400 }, { status: 400 });
            if (typeof body.old_password !== "string" || !await allowAuthAttempt(`change-password:${session.user.id}`, 10, 15 * 60 * 1000)) return NextResponse.json({ message: "Too many attempts. Try again later.", status: 429 }, { status: 429 });
            const isValid = user.password && await compare(body.old_password, user.password);
            if(!isValid) return NextResponse.json({message: "Incorrect Old Password", status: 401}, {status: 401});
            const changed = await Users.updateOne({ _id: user._id, status: 1, password: user.password }, {
                $set: { password: await hash(body.new_password, 10) }, $inc: { session_version: 1 },
            });
            if (!changed.matchedCount) return NextResponse.json({ message: "Password changed elsewhere. Sign in again.", status: 409 }, { status: 409 });
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
