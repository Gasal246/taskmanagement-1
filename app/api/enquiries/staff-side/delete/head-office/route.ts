import { NextRequest } from "next/server";
import { staffHeadOfficeRequest } from "@/lib/enquiries/staff-head-office-route";
export const DELETE = (req: NextRequest) => staffHeadOfficeRequest(req, "remove");
