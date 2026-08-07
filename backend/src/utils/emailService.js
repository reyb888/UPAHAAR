import nodemailer from 'nodemailer';

// Create reusable transporter configured via environment variables
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports (STARTTLS)
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

/**
 * Sends a password reset OTP email to the user.
 * @param {string} toEmail - Recipient email address
 * @param {string} fullName - User's full name for personalization
 * @param {string} otpCode - The 6-digit OTP code
 * @returns {Promise<boolean>} - true if sent successfully
 */
export const sendPasswordResetEmail = async (toEmail, fullName, otpCode) => {
    const transporter = createTransporter();

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8; padding:40px 20px;">
            <tr>
                <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #1E3A8A, #2563EB); padding:32px 40px; text-align:center;">
                                <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:700; letter-spacing:1px;">UPAHAAR</h1>
                                <p style="color:#93C5FD; margin:8px 0 0 0; font-size:14px;">Digital Health Records Platform</p>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding:36px 40px;">
                                <h2 style="color:#1E3A8A; margin:0 0 8px 0; font-size:20px;">Password Reset Request</h2>
                                <p style="color:#64748B; margin:0 0 24px 0; font-size:14px; line-height:1.6;">
                                    Hello <strong style="color:#1E293B;">${fullName}</strong>, we received a request to reset your password. Use the verification code below to proceed:
                                </p>
                                <!-- OTP Box -->
                                <div style="background: linear-gradient(135deg, #EFF6FF, #DBEAFE); border: 2px dashed #2563EB; border-radius:12px; padding:24px; text-align:center; margin:0 0 24px 0;">
                                    <p style="color:#64748B; font-size:12px; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:2px; font-weight:600;">Your Verification Code</p>
                                    <p style="color:#1E3A8A; font-size:36px; font-weight:800; margin:0; letter-spacing:8px; font-family:monospace;">${otpCode}</p>
                                </div>
                                <p style="color:#EF4444; font-size:13px; margin:0 0 20px 0; padding:12px 16px; background:#FEF2F2; border-radius:8px; border-left:4px solid #EF4444;">
                                    ⏱ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
                                </p>
                                <p style="color:#94A3B8; font-size:13px; margin:0; line-height:1.6;">
                                    If you did not request this password reset, you can safely ignore this email. Your account remains secure.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color:#F8FAFC; padding:20px 40px; text-align:center; border-top:1px solid #E2E8F0;">
                                <p style="color:#94A3B8; font-size:11px; margin:0;">
                                    © ${new Date().getFullYear()} UPAHAAR — Your Health, Digitally Secured.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: `"UPAHAAR Health" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: '🔐 UPAHAAR — Password Reset Verification Code',
            html: htmlContent
        });
        console.log(`Password reset email sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('Failed to send password reset email:', error.message);
        return false;
    }
};
