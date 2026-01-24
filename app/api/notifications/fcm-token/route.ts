import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import FcmTokens from "@/models/fcm_tokens.model";
import { NextResponse } from "next/server";

connectDB();

type Body = {
  token?: string;
  platform?: string;
  device?: string;
};

export async function POST(req: Request) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json(
        { message: "Un-Authorized Access", status: 401 },
        { status: 401 }
      );
    }

    const body: Body = await req.json();
    if (!body?.token || typeof body.token !== "string") {
      return NextResponse.json(
        { message: "FCM token is required", status: 400 },
        { status: 400 }
      );
    }

    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { message: "User id missing", status: 400 },
        { status: 400 }
      );
    }

    await FcmTokens.findOneAndUpdate(
      { token: body.token },
      {
        token: body.token,
        user_id: userId,
        platform: body.platform ?? null,
        device: body.device ?? null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(
      { message: "Token saved", status: 200 },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving FCM token", error);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
