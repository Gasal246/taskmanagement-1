import connectDB from "@/lib/mongo"
import { transporter } from "@/lib/nodemailer";
import { generateOTP } from "@/lib/utils";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST(req: NextRequest, context: { params: Promise<{ email: string }> }) {
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

        await transporter.sendMail({
            from: process.env.NEXT_NODEMAILER_USER,
            to: email,
            subject: "Email verification - TaskManager",
            text: `Your one time password is ${otp}`,
            html: `<h1>TaskManager Email Verification</h1>
                    <p>Your One Time Password:</p> <h2>${otp}</h2>`
        })

        return NextResponse.json({ message: "Email sent successfully" }, { status: 200 });
    } catch (error) {
        console.log(error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export const dynamic = "force-dynamic"
