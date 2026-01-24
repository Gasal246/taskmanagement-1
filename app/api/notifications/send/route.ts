import { NextResponse } from "next/server";
import { getAdminMessaging } from "@/lib/firebaseAdmin";

type Body = {
  token?: string;
  tokens?: string[];
  topic?: string;
  title?: string;
  body?: string;
  data?: Record<string, string | number | boolean>;
};

function normalizeData(
  data?: Record<string, string | number | boolean>
): Record<string, string> | undefined {
  if (!data) return undefined;
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)])
  );
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.FCM_API_KEY;
    if (apiKey) {
      const headerKey = req.headers.get("x-api-key");
      if (headerKey !== apiKey) {
        return NextResponse.json(
          { message: "Unauthorized", status: 401 },
          { status: 401 }
        );
      }
    }

    const body: Body = await req.json();
    const token = body.token?.trim();
    const tokens = body.tokens?.filter(Boolean) ?? [];
    const topic = body.topic?.trim();
    const notification =
      body.title || body.body
        ? {
            title: body.title || "",
            body: body.body || "",
          }
        : undefined;

    const data = normalizeData(body.data);
    if (!notification && !data) {
      return NextResponse.json(
        { message: "Notification title/body or data is required", status: 400 },
        { status: 400 }
      );
    }

    const messaging = getAdminMessaging();

    if (tokens.length > 0) {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification,
        data,
      });
      return NextResponse.json(
        {
          message: "Multicast sent",
          status: 200,
          successCount: response.successCount,
          failureCount: response.failureCount,
          responses: response.responses.map((res, idx) => ({
            token: tokens[idx],
            success: res.success,
            messageId: res.messageId || null,
            error: res.error?.message || null,
          })),
        },
        { status: 200 }
      );
    }

    if (token) {
      const messageId = await messaging.send({
        token,
        notification,
        data,
      });
      return NextResponse.json(
        { message: "Sent", status: 200, messageId },
        { status: 200 }
      );
    }

    if (topic) {
      const messageId = await messaging.send({
        topic,
        notification,
        data,
      });
      return NextResponse.json(
        { message: "Sent", status: 200, messageId },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Provide token, tokens, or topic",
        status: 400,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("FCM send error", error);
    return NextResponse.json(
      { message: error?.message || "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
