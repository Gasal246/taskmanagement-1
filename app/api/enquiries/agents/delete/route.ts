import connectDB from "@/lib/mongo";
import { agentManagementScope, AgentAccessError } from "@/lib/enquiries/agent-access";
import EqAgentDetails from "@/models/eq_agents_details.model";
import UserRoles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import Staff from "@/models/business_staffs.model";
import Admins from "@/models/admin_assign_business.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  let dbSession: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const params = req.nextUrl.searchParams;
    const userId = params.get("agent_id");
    const scope = await agentManagementScope(userId, params.get("business_id"));
    if (scope.actor.actorId === userId) return NextResponse.json({ message: "You cannot delete your own account here" }, { status: 403 });
    dbSession = await mongoose.startSession();
    await dbSession.withTransaction(async () => {
      await UserRoles.deleteMany({ user_id: userId, role_id: scope.agentRole.role_id._id, business_id: scope.businessId }).session(dbSession!);
      const hasRoles = await UserRoles.exists({ user_id: userId }).session(dbSession!);
      const hasStaff = await Staff.exists({ user_id: userId }).session(dbSession!);
      const hasAdmin = await Admins.exists({ user_id: userId }).session(dbSession!);
      if (!hasRoles && !hasStaff && !hasAdmin) {
        await EqAgentDetails.deleteOne({ user_id: userId }).session(dbSession!);
        await Users.deleteOne({ _id: userId }).session(dbSession!);
      }
    });
    return NextResponse.json({ message: "Agent removed from this business", status: 200 });
  } catch (error) {
    const status = error instanceof AgentAccessError ? error.status : 500;
    return NextResponse.json({ message: error instanceof AgentAccessError ? error.message : "Unable to remove agent" }, { status });
  } finally { await dbSession?.endSession(); }
}
