import { NextRequest } from "next/server";
import { staffHeadOfficeRequest } from "@/lib/enquiries/staff-head-office-route";
export const POST = (req: NextRequest) => staffHeadOfficeRequest(req, "create");
