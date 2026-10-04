import mongoose from "mongoose";
import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";

// Authentication events are authoritative. Closing a tab or reloading does
// not end a session and must not create a false login/logout record.
export async function recordAuthActivity(userId: string, isSuper: boolean, action: "login" | "logout") {
  if (isSuper || !mongoose.isValidObjectId(userId)) return;
  try {
    await connectDB();
    await Users.updateOne({ _id: userId }, { $set: { [action === "login" ? "last_login" : "last_logout"]: new Date() } });
  } catch {
    console.error(`Unable to record authentication ${action}`);
  }
}
