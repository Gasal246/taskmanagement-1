import connectDB from "@/lib/mongo";
import Superadmin from "@/models/superAdminCollection";
import Users from "@/models/users.model";
import { compare } from "bcrypt-ts";
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
        await connectDB();
        try {
          if (credentials?.isSuper === "false") {
            const user = await Users.findOne({ email: credentials?.email });
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
              email: credentials?.email,
            });
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
          console.log(error);
          throw new Error(error);
        }
      },
    }),
  ],
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
        };
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

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
