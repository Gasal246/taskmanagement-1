import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST(req: NextRequest) {
    try {
        const session: any = await auth();
        if (!session) {
            return NextResponse.json({ message: "Un-Authorized Access", status: 401 }, { status: 401 });
        }

        if (session?.user?.is_super) {
            return NextResponse.json({ message: "Ignored", status: 200 }, { status: 200 });
        }

        const contentType = req.headers.get("content-type") || "";
        let body: any = {};

        if (contentType.includes("application/json")) {
            body = await req.json();
        } else {
            const rawBody = await req.text();
            if (rawBody) {
                body = JSON.parse(rawBody);
            }
        }

        const action = body?.action;
        if (action !== "login" && action !== "logout") {
            return NextResponse.json({ message: "Invalid action", status: 400 }, { status: 400 });
        }

        const update = action === "login"
            ? { last_login: new Date() }
            : { last_logout: new Date() };

        const updatedUser = await Users.findByIdAndUpdate(session?.user?.id, update, { new: true });
        if (!updatedUser) {
            return NextResponse.json({ message: "User not found", status: 404 }, { status: 404 });
        }

        return NextResponse.json({ message: "Activity updated", status: 200 }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
