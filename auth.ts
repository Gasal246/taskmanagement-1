import { recordAuthActivity } from "@/lib/auth-activity";
import connectDB from "@/lib/mongo";
import Superadmin from "@/models/superAdminCollection";
import Users from "@/models/users.model";
import { compare } from "bcrypt-ts";
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { authAvailabilityBoundary, authClientFailureResponse, authStorageFailed, markAuthStorageFailure, temporarilyUnavailableResponse } from "@/lib/auth-availability";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isSuper: { label: "IsSuper", type: "text" },
      },
      authorize: async (credentials: any) => {
        try {
          await connectDB();
          const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
          if (!email || email.length > 254 || typeof credentials?.password !== "string" || credentials.password.length > 128) return null;
          if (!await allowAuthAttempt(`login:${credentials?.isSuper}:${email}`, 20, 5 * 60 * 1000)) return null;
          if (credentials?.isSuper === "false") {
            const user = await Users.findOne({ email }).select("+password +session_version");
            if (!user) throw new Error("User not found.");
            if (user?.status == 0) throw new Error("User is blocked.");
            const passwordMatch = await compare(
              credentials?.password,
              user?.password
            );
            if (!passwordMatch) throw new Error("Password mismatch.");
            return user;
          }
          if (credentials?.isSuper == "true") {
            const admin = await Superadmin.findOne({
              email,
            }).select("+password");
            if (!admin) throw new Error("No Such admin Found.");
            const passwordMatch = await compare(
              credentials?.password,
              admin?.password
            );
            if (!passwordMatch) throw new Error("Password mismatch.");
            return admin;
          }
          return null;
        } catch (error: any) {
          markAuthStorageFailure(error);
          return null;
        }
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      const account: any = user;
      await recordAuthActivity(String(account._id || account.id || ""), Boolean(account.is_super), "login");
    },
    async signOut(message) {
      const account: any = "token" in message ? message.token?.user : null;
      if (account) await recordAuthActivity(String(account.userid || ""), Boolean(account.is_super), "logout");
    },
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        const rawId = user?._id ?? user?.id ?? "";
        let userId = "";
        if (typeof rawId === "string") {
          userId = rawId;
        } else if (typeof rawId === "object") {
          if ("$oid" in rawId && typeof rawId.$oid === "string") {
            userId = rawId.$oid;
          } else if (
            typeof rawId.toString === "function" &&
            rawId.toString !== Object.prototype.toString
          ) {
            userId = rawId.toString();
          }
        }
        token.user = {
          userid: userId,
          email: user.email,
          is_super: user.is_super,
          session_version: user.session_version ?? 0,
        };
      } else if (token?.user?.userid) {
        try {
          await connectDB();
          const account: any = token.user.is_super
            ? await Superadmin.findById(token.user.userid).select("_id").lean()
            : await Users.findById(token.user.userid).select("status +session_version").lean();
          if (!account || (!token.user.is_super && (account.status !== 1 || (account.session_version ?? 0) !== (token.user.session_version ?? 0)))) return null;
        } catch (error) {
          if (!markAuthStorageFailure(error)) throw error;
          return null; // Fail closed; the boundary returns 503 without deleting cookies.
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token?.user && session?.user) {
        session.user.id = token.user.userid;
        session.user.email = token.user.email;
        session.user.is_super = token.user.is_super;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
};

const nextAuth = NextAuth(authConfig);
const invokeAuth = nextAuth.auth as (...args: any[]) => any;
// Preserve Auth.js overloads used by server components, route handlers and middleware.
export const auth = ((...args: any[]) => {
  if (typeof args[0] === "function") {
    const handler = args[0];
    const wrapped = invokeAuth((...handlerArgs: any[]) => authStorageFailed()
      ? temporarilyUnavailableResponse() : handler(...handlerArgs));
    return (...handlerArgs: any[]) => authAvailabilityBoundary(() => wrapped(...handlerArgs), true);
  }
  if (args[0] instanceof Request) return authAvailabilityBoundary(() => invokeAuth(...args), true);
  return authAvailabilityBoundary(() => invokeAuth(...args));
}) as typeof nextAuth.auth;
export const handlers = {
  GET: ((...args: Parameters<typeof nextAuth.handlers.GET>) => authAvailabilityBoundary(() => nextAuth.handlers.GET(...args), true)) as typeof nextAuth.handlers.GET,
  POST: (async (...args: Parameters<typeof nextAuth.handlers.POST>) => authClientFailureResponse(args[0],
    await authAvailabilityBoundary(() => nextAuth.handlers.POST(...args), true))) as typeof nextAuth.handlers.POST,
};
export const signIn = ((...args: Parameters<typeof nextAuth.signIn>) => authAvailabilityBoundary(() => nextAuth.signIn(...args))) as typeof nextAuth.signIn;
export const signOut = nextAuth.signOut;
