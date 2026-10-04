import { AsyncLocalStorage } from "node:async_hooks";
import { NextResponse } from "next/server";

const availability = new AsyncLocalStorage<{ unavailable: boolean }>();
const temporaryErrors = new Set([
  "MongoWaitQueueTimeoutError", "MongoServerSelectionError", "MongoNetworkError",
  "MongoNetworkTimeoutError", "MongoPoolClosedError", "MongoTopologyClosedError", "MongoNotConnectedError",
]);

export class AuthStorageUnavailableError extends Error {
  constructor() { super("Session verification is temporarily unavailable"); this.name = "AuthStorageUnavailableError"; }
}

export function isTemporaryDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("name" in error)) return false;
  if (temporaryErrors.has(String(error.name))) return true;
  return error.name === "MongoServerError" && "code" in error &&
    [6, 7, 50, 89, 91, 189, 10107, 11600, 11602, 13435, 13436].includes(Number(error.code));
}

export function markAuthStorageFailure(error: unknown): boolean {
  if (!isTemporaryDatabaseError(error)) return false;
  const state = availability.getStore();
  if (state) state.unavailable = true;
  return true;
}

export function authStorageFailed(): boolean { return Boolean(availability.getStore()?.unavailable); }

export function temporarilyUnavailableResponse() {
  return NextResponse.json({ message: "The service is temporarily busy. Please try again shortly.", status: 503 }, {
    status: 503, headers: { "Retry-After": "2", "Cache-Control": "private, no-store" },
  });
}

export function temporaryDatabaseFailureResponse(error: unknown) {
  return error instanceof AuthStorageUnavailableError || isTemporaryDatabaseError(error) ? temporarilyUnavailableResponse() : null;
}

// next-auth/react signIn({ redirect: false }) parses the returned URL even on
// failure. Keep that response contract while reporting a genuine HTTP 503.
export function authClientFailureResponse(request: Request, response: Response) {
  if (response.status !== 503 || request.headers.get("X-Auth-Return-Redirect") !== "1") return response;
  return NextResponse.json({ message: "Sign-in is temporarily unavailable. Please try again shortly.", status: 503,
    url: new URL("/api/auth/error?error=ServiceUnavailable", request.url).href }, {
    status: 503, headers: { "Retry-After": "2", "Cache-Control": "private, no-store" },
  });
}

// Auth.js catches callback errors and may append cookie deletions. Replace that
// entire response on temporary storage failure; never grant access or erase a
// valid session because the database is busy. State is isolated per invocation.
export function authAvailabilityBoundary<T>(operation: () => Promise<T>, responseMode: true): Promise<T | Response>;
export function authAvailabilityBoundary<T>(operation: () => Promise<T>, responseMode?: false): Promise<T>;
export function authAvailabilityBoundary<T>(operation: () => Promise<T>, responseMode = false): Promise<T | Response> {
  return availability.run({ unavailable: false }, async () => {
    try {
      const result = await operation();
      if (authStorageFailed()) throw new AuthStorageUnavailableError();
      return result;
    } catch (error) {
      if (!authStorageFailed() && !(error instanceof AuthStorageUnavailableError)) throw error;
      if (responseMode) return temporarilyUnavailableResponse();
      throw new AuthStorageUnavailableError();
    }
  });
}
