import nodemailer from "nodemailer"

const email = process.env.NEXT_NODEMAILER_USER;
const password = process.env.NEXT_NODEMAILER_PASS;

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: email,
        pass: password
    }
})
