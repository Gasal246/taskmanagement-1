import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { resolveSessionUserId } from "@/lib/utils";
import EqCustomMapPins from "@/models/eq_custom_map_pins.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

const isValidCoordinates = (latitude: number, longitude: number) => {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

export async function GET() {
  try {
    const session = await auth();
    const userId = resolveSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
    }

    const pins = await EqCustomMapPins.find({ user_id: userId }).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      {
        status: 200,
        pins: pins.map((pin: any) => ({
          id: String(pin._id),
          title: pin.title || "",
          description: pin.description || "",
          latitude: pin.latitude,
          longitude: pin.longitude,
          user_id: String(pin.user_id),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error while getting custom map pins: ", error);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = resolveSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
    }

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    if (!title || !isValidCoordinates(latitude, longitude)) {
      return NextResponse.json({ message: "Invalid custom pin", status: 400 }, { status: 400 });
    }

    const pin = await EqCustomMapPins.create({
      user_id: userId,
      title,
      description,
      latitude,
      longitude,
    });

    return NextResponse.json(
      {
        status: 201,
        message: "Custom pin saved",
        pin: {
          id: String(pin._id),
          title: pin.title,
          description: pin.description,
          latitude: pin.latitude,
          longitude: pin.longitude,
          user_id: String(pin.user_id),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.log("Error while saving custom map pin: ", error);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const userId = resolveSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
    }

    const body = await req.json();
    const id = String(body?.id || "");
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    if (!id || !title || !isValidCoordinates(latitude, longitude)) {
      return NextResponse.json({ message: "Invalid custom pin", status: 400 }, { status: 400 });
    }

    const pin = await EqCustomMapPins.findOneAndUpdate(
      { _id: id, user_id: userId },
      { title, description, latitude, longitude },
      { new: true }
    );

    if (!pin) {
      return NextResponse.json({ message: "Custom pin not found", status: 404 }, { status: 404 });
    }

    return NextResponse.json(
      {
        status: 200,
        message: "Custom pin updated",
        pin: {
          id: String(pin._id),
          title: pin.title,
          description: pin.description,
          latitude: pin.latitude,
          longitude: pin.longitude,
          user_id: String(pin.user_id),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error while updating custom map pin: ", error);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const userId = resolveSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Custom pin id is required", status: 400 }, { status: 400 });
    }

    const pin = await EqCustomMapPins.findOneAndDelete({ _id: id, user_id: userId });

    if (!pin) {
      return NextResponse.json({ message: "Custom pin not found", status: 404 }, { status: 404 });
    }

    return NextResponse.json({ status: 200, message: "Custom pin deleted" }, { status: 200 });
  } catch (error) {
    console.log("Error while deleting custom map pin: ", error);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
