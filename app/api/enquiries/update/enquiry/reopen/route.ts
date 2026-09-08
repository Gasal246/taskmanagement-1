import { NextRequest } from "next/server";
import { handleTransition } from "@/lib/enquiries/completion-http";
export async function PUT(req: NextRequest) { return handleTransition(req, true); }
