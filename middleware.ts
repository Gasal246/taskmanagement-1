import { auth } from "@/auth";
import { NextRequest, NextResponse, type NextFetchEvent, type NextMiddleware } from "next/server";

const publicRecoveryPaths = new Set([
  "/api/users/verification/send-mail",
  "/api/users/verification/verify",
  "/api/users/verification/setup-pass",
]);

// Authentication is the baseline; resource-specific authorization stays in routes.
const authenticatedMiddleware = auth(request => {
  const path = request.nextUrl.pathname;
  if (!request.auth?.user?.id) return NextResponse.json({ message: "Sign in to continue", status: 401 }, { status: 401 });
  if ((path === "/api/superadmin" || (path.startsWith("/api/superadmin/") && path !== "/api/superadmin/roles/get-all") || path.startsWith("/api/business/admin/") || path.startsWith("/api/business/add-business")) && !request.auth.user.is_super) {
    return NextResponse.json({ message: "Superadmin access required", status: 403 }, { status: 403 });
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}) as unknown as NextMiddleware;

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const path = request.nextUrl.pathname;
  // These handlers own their authentication; a stale browser session must not
  // prevent recovery, worker authentication or an explicit sign-out during an outage.
  if (path.startsWith("/api/auth/") || publicRecoveryPaths.has(path) || path === "/api/internal/jobs/run" ||
    (path === "/api/notifications/send" && process.env.FCM_API_KEY && request.headers.get("x-api-key") === process.env.FCM_API_KEY)) return NextResponse.next();
  return authenticatedMiddleware(request, event);
}

export const config = { matcher: "/api/:path*", runtime: "nodejs" };
