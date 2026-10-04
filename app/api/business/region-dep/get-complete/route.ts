import { NextRequest } from "next/server";
import { organizationOverview } from "@/lib/organization-overview";

export function GET(req: NextRequest) {
  return organizationOverview(req, "region-department");
}

export const dynamic = "force-dynamic";
