import connectDB from "@/lib/mongo";
import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from 'bcrypt-ts'
import Superadmin from "@/models/superAdminCollection";
import Users from "@/models/users.model";


export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            id: 'credentials',
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                isSuper: { label: 'IsSuper', type:'text'}
            },
            authorize: async function (credentials: any) {
                await connectDB()
                try {
                    if(credentials?.isSuper === 'false'){
                        const user = await Users.findOne({ email: credentials?.email });
                        if(!user) throw new Error("User not found.");
                        if(user?.status == 2) throw new Error("User is blocked.");
                        const passwordMatch = await compare(credentials?.password, user?.password);
                        if(!passwordMatch) throw new Error("Password mismatch.");
                        return user;
                    }else if(credentials?.isSuper == 'true'){
                        const admin = await Superadmin.findOne({ email: credentials?.email })
                        if(!admin) throw new Error("No Such admin Found.");
                        const passwordMatch = await compare(credentials?.password, admin?.password);
                        if(!passwordMatch) throw new Error("Password mismatch.");
                        return admin;
                    }
                } catch (error: any) {
                    console.log(error);
                    throw new Error(error);
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }: { token: any, user: any }) {
            if (user) {
                const userdata = {
                    userid: user._id,
                    email: user.email,
                    is_super: user.is_super
                }
                token.user = userdata;
            }
            return token;
        },
        async session({ session, token }: { session: any, token: any }) {
            session.user.id = token.user.userid;
            session.user.email = token.user.email;
            session.user.is_super = token.user.is_super;
            return session;
        }
    },
    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
    }
}

export const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

export const dynamic = "force-dynamic";
