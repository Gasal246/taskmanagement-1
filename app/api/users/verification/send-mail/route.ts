import connectDB from "@/lib/mongo";
import { generateOTP } from "@/lib/utils";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { transporter } from "@/lib/nodemailer";

connectDB();

export async function POST (req: NextRequest ) {
    try {
        const { email } = await req.json();
        const user = await Users.findOne({ email });
        if(!user){
            return Response.json({ status: false, message: "User not found" })
        }
        const newpin = generateOTP();
        await Users.findByIdAndUpdate(user?._id, { otp: newpin });

        const origin = process.env.NEXTAUTH_URL || req.headers.get("origin") || "";
        const encodedEmail = encodeURIComponent(email);
        const resetUrl = `${origin}/verification/${encodedEmail}/reset-password/${newpin}`;

        await transporter.sendMail({
            from: process.env.NEXT_NODEMAILER_USER,
            to: email,
            subject: "Task Manager - Reset your password",
            text: `Click the link to reset your password: ${resetUrl}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
                    <h2 style="color: #2c3e50; text-align: center;">Task Manager</h2>
                    <p style="font-size: 16px; color: #333;">Hello,</p>
                    <p style="font-size: 16px; color: #333;">Tap the button below to reset your password.</p>
                    <div style="margin: 24px 0; text-align: center;">
                        <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; font-size: 16px; font-weight: bold; color: #fff; background-color: #3498db; border-radius: 6px; text-decoration: none;">Reset Password</a>
                    </div>
                    <p style="font-size: 14px; color: #333;">Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; font-size: 13px; color: #555;">${resetUrl}</p>
                    <p style="font-size: 14px; color: #888;">If you did not request this, you can safely ignore this email.</p>
                    <p style="font-size: 14px; color: #888;">Thanks,<br/>Task Manager Team</p>
                </div>
            `
        })
        
        return Response.json({ status: true, message: "Reset link sent" })
    } catch (error) {
        console.log(error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export const dynamic = 'force-dynamic'
