import connectDB from "@/lib/mongo";
import { agentManagementScope, canChangeAgentAccount, AgentAccessError } from "@/lib/enquiries/agent-access";
import UserRoles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  let dbSession: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const params = req.nextUrl.searchParams;
    const userId = params.get("user_id");
    const scope = await agentManagementScope(userId, params.get("business_id"));
    if (scope.actor.actorId === userId || !await canChangeAgentAccount(userId!, scope.roles, scope.businessId, scope.actor)) return NextResponse.json({ message: "This account has other business roles; global account changes require a superadmin" }, { status: 403 });
    const nextStatus = scope.agentRole.status === 1 ? 0 : 1;
    dbSession = await mongoose.startSession();
    await dbSession.withTransaction(async () => {
      const changed = await UserRoles.updateOne({ _id: scope.agentRole._id, status: scope.agentRole.status }, { $set: { status: nextStatus } }, { session: dbSession });
      if (!changed.modifiedCount) throw new AgentAccessError(409, "Agent changed elsewhere. Refresh and try again");
      const user = await Users.updateOne({ _id: userId }, { $set: { status: nextStatus }, $inc: { session_version: 1 } }, { session: dbSession });
      if (!user.matchedCount) throw new AgentAccessError(404, "Agent account not found");
    });
    return NextResponse.json({ message: nextStatus ? "Agent activated" : "Agent deactivated", status: 200 });
  } catch (error) {
    const status = error instanceof AgentAccessError ? error.status : 500;
    return NextResponse.json({ message: error instanceof AgentAccessError ? error.message : "Unable to change agent status" }, { status });
  } finally { await dbSession?.endSession(); }
}
