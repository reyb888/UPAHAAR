import nodemailer from 'nodemailer';

/**
 * Sends a password reset OTP email using nodemailer over SMTP.
 * Supports Gmail (with App Password), SendGrid, Outlook, Mailtrap, or custom SMTP servers.
 * 
 * @param {string} toEmail - Recipient email address
 * @param {string} fullName - User's full name for personalization
 * @param {string} otpCode - The 6-digit OTP code
 * @returns {Promise<{success: boolean, simulated?: boolean, error?: string, messageId?: string}>}
 */
export const sendPasswordResetEmail = async (toEmail, fullName, otpCode) => {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const from = process.env.SMTP_FROM || `"UPAHAAR Health" <${user || 'no-reply@upahaar.org'}>`;

    // ── Local Dev / Missing Credentials Fallback ──────────────────
    if (!user || !pass) {
        console.warn('\n⚠️  [EMAIL SERVICE] SMTP credentials (SMTP_USER/SMTP_PASS) are not configured in backend/.env.');
        console.log(`╔══════════════════════════════════════════════════════════════════╗`);
        console.log(`║  🔐 [LOCAL SIMULATION MODE] PASSWORD RESET CODE                   ║`);
        console.log(`║  Recipient : ${toEmail.padEnd(51)} ║`);
        console.log(`║  OTP Code  : ${otpCode.padEnd(51)} ║`);
        console.log(`║  To send real emails, set SMTP_USER & SMTP_PASS in backend/.env  ║`);
        console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);

        return {
            success: false,
            simulated: true,
            otpCode,
            error: 'SMTP credentials (SMTP_USER/SMTP_PASS) not configured in backend/.env'
        };
    }

    // ── HTML Email Content ─────────────────────────────────────────
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
                        <tr>
                            <td style="background: linear-gradient(135deg, #1E3A8A, #2563EB); padding:32px 40px; text-align:center;">
                                <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:700; letter-spacing:1px;">UPAHAAR</h1>
                                <p style="color:#93C5FD; margin:8px 0 0 0; font-size:14px;">Digital Health Records Platform</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:36px 40px;">
                                <h2 style="color:#1E3A8A; margin:0 0 8px 0; font-size:20px;">Password Reset Request</h2>
                                <p style="color:#64748B; margin:0 0 24px 0; font-size:14px; line-height:1.6;">
                                    Hello <strong style="color:#1E293B;">${fullName || 'User'}</strong>, we received a request to reset your password. Use the verification code below to proceed:
                                </p>
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

    // ── Nodemailer Transporter Configuration ───────────────────────
    try {
        console.log(`[EMAIL SERVICE] Initializing SMTP connection to ${host}:${port} (secure=${port === 465})...`);

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from,
            to: toEmail,
            subject: '🔒 UPAHAAR — Password Reset Verification Code',
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SERVICE] ✅ Email delivered successfully to ${toEmail} (Message ID: ${info.messageId})`);

        return {
            success: true,
            messageId: info.messageId
        };
    } catch (err) {
        console.error(`[EMAIL SERVICE] ❌ Failed to send email to ${toEmail}:`, err.message);
        console.log(`╔══════════════════════════════════════════════════════════════════╗`);
        console.log(`║  🔐 [FALLBACK OTP LOG] PASSWORD RESET CODE                       ║`);
        console.log(`║  Recipient : ${toEmail.padEnd(51)} ║`);
        console.log(`║  OTP Code  : ${otpCode.padEnd(51)} ║`);
        console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);

        return {
            success: false,
            simulated: false,
            otpCode,
            error: err.message
        };
    }
};
