import tls from 'tls';

/**
 * Sends a password reset OTP email to the user using raw SMTP over TLS (zero dependencies).
 * Connects on port 465 (SMTPS) by default — direct TLS, no STARTTLS upgrade needed.
 * @param {string} toEmail - Recipient email address
 * @param {string} fullName - User's full name for personalization
 * @param {string} otpCode - The 6-digit OTP code
 * @returns {Promise<boolean>} - true if sent successfully
 */
export const sendPasswordResetEmail = async (toEmail, fullName, otpCode) => {
    return new Promise((resolve) => {
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        // MUST be 465 for direct TLS (SMTPS). Port 587 uses STARTTLS which is not supported by this implementation.
        const port = parseInt(process.env.SMTP_PORT) || 465;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!user || !pass) {
            console.error('❌ SMTP credentials are not configured. Set SMTP_USER and SMTP_PASS in your .env file.');
            console.error('   To use Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465');
            console.error('   SMTP_USER=your_email@gmail.com, SMTP_PASS=your_16_char_app_password');
            return resolve(false);
        }

        console.log(`📧 Attempting SMTP connection to ${host}:${port} for ${toEmail}...`);

        let settled = false;
        const done = (success) => {
            if (!settled) {
                settled = true;
                if (success) {
                    console.log(`✅ Email sent successfully to ${toEmail}`);
                } else {
                    console.error(`❌ Failed to send email to ${toEmail}`);
                }
                resolve(success);
            }
        };

        // Timeout after 15 seconds
        const timeout = setTimeout(() => {
            console.error('⏱ SMTP connection timed out after 15 seconds');
            try { socket.destroy(); } catch (_) {}
            done(false);
        }, 15000);

        const socket = tls.connect({
            host: host,
            port: port,
            rejectUnauthorized: false
        });

        let step = 0;

        const send = (data) => {
            socket.write(data + '\r\n');
        };

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
                                        Hello <strong style="color:#1E293B;">${fullName}</strong>, we received a request to reset your password. Use the verification code below to proceed:
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

        /**
         * Get the last line of a potentially multi-line SMTP response.
         * SMTP multi-line responses use "250-..." for intermediate lines
         * and "250 ..." (space after code) for the final line.
         */
        const getLastLine = (response) => {
            const lines = response.trim().split(/\r?\n/);
            return lines[lines.length - 1];
        };

        socket.on('data', (data) => {
            const response = data.toString();

            // Check the LAST line for error codes (multi-line responses)
            const lastLine = getLastLine(response);

            if (lastLine.startsWith('5') || lastLine.startsWith('4')) {
                console.error('SMTP Error:', response.trim());
                socket.end();
                clearTimeout(timeout);
                return done(false);
            }

            if (step === 0 && response.startsWith('220')) {
                send(`EHLO ${host}`);
                step = 1;
            } else if (step === 1) {
                // EHLO returns multi-line. Wait for the final line (no hyphen after code).
                // e.g. "250-SIZE 35882577\r\n250-AUTH LOGIN\r\n250 SMTPUTF8"
                // The final line starts with "250 " (space, not hyphen).
                if (lastLine.match(/^250 /)) {
                    send('AUTH LOGIN');
                    step = 2;
                }
            } else if (step === 2 && lastLine.startsWith('334')) {
                send(Buffer.from(user).toString('base64'));
                step = 3;
            } else if (step === 3 && lastLine.startsWith('334')) {
                send(Buffer.from(pass).toString('base64'));
                step = 4;
            } else if (step === 4 && lastLine.startsWith('235')) {
                send(`MAIL FROM:<${user}>`);
                step = 5;
            } else if (step === 5 && lastLine.startsWith('250')) {
                send(`RCPT TO:<${toEmail}>`);
                step = 6;
            } else if (step === 6 && lastLine.startsWith('250')) {
                send('DATA');
                step = 7;
            } else if (step === 7 && lastLine.startsWith('354')) {
                const mail = [
                    `From: "UPAHAAR Health" <${user}>`,
                    `To: <${toEmail}>`,
                    `Subject: =?UTF-8?B?8J+UkCBVUEFIQUFSIOKAlCBQYXNzd29yZCBSZXNldCBWZXJpZmljYXRpb24gQ29kZQ==?=`,
                    'MIME-Version: 1.0',
                    'Content-Type: text/html; charset=utf-8',
                    '',
                    htmlContent,
                    '.'
                ].join('\r\n');
                send(mail);
                step = 8;
            } else if (step === 8 && lastLine.startsWith('250')) {
                send('QUIT');
                step = 9;
                clearTimeout(timeout);
                done(true);
            }
        });

        socket.on('error', (err) => {
            console.error('SMTP Socket Error:', err.message);
            clearTimeout(timeout);
            done(false);
        });

        socket.on('end', () => {
            clearTimeout(timeout);
        });
    });
};
