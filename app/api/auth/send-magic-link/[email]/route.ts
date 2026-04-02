import connectDB from "@/lib/mongo"
import { transporter } from "@/lib/nodemailer";
import { generateOTP } from "@/lib/utils";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { URL } from "url";

connectDB();

export async function GET(req: NextRequest, context: { params: Promise<{ email: string }> }) {
    try {
        const { email } = await context.params;
        if (!email) {
            return NextResponse.json({ message: "Email is required" }, { status: 400 });
        }

        const exist = await Users.findOne({ email });
        if (!exist) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const otp = generateOTP();
        await Users.findByIdAndUpdate(exist?._id, { otp });

        const origin = process.env.NEXTAUTH_URL || req.headers.get("origin") || "";
        const encodedEmail = encodeURIComponent(email);
        await transporter.sendMail({
            from: process.env.NEXT_NODEMAILER_USER,
            to: email,
            subject: "magic link for Reset Password",
            text: '...',
            html: `<h1>Forget Password ?</h1>
                    <p>Follow this link to get into <strong>Reset Password Page</strong>:</p> 
                    <a href="${origin}/verification/${encodedEmail}/reset-password/${otp}">
                        <h2>${origin}/verification/${encodedEmail}/reset-password/${otp}</h2>
                    </a>`
        })
        return NextResponse.json({ message: "Email sent successfully" }, { status: 200 });
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
