import { NextRequest } from "next/server";
import { staffHeadOfficeRequest } from "@/lib/enquiries/staff-head-office-route";
export const PUT = (req: NextRequest) => staffHeadOfficeRequest(req, "edit");
