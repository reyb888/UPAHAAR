import tls from 'tls';

/**
 * Sends a password reset OTP email to the user using raw SMTP over TLS (zero dependencies).
 * @param {string} toEmail - Recipient email address
 * @param {string} fullName - User's full name for personalization
 * @param {string} otpCode - The 6-digit OTP code
 * @returns {Promise<boolean>} - true if sent successfully
 */
export const sendPasswordResetEmail = async (toEmail, fullName, otpCode) => {
    return new Promise((resolve) => {
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        // Default to 465 for secure TLS connection
        const port = parseInt(process.env.SMTP_PORT) || 465;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!user || !pass) {
            console.warn('SMTP credentials are not configured in environment variables. Simulating email sending.');
            console.log(`[LOCAL DEV] Password reset verification code for ${toEmail}: ${otpCode}`);
            return resolve(true);
        }

        console.log(`Attempting secure SMTP connection to ${host}:${port}...`);
        
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

        socket.on('data', (data) => {
            const response = data.toString();
            // Uncomment to debug SMTP conversation logs
            // console.log('SMTP:', response.trim());

            if (response.startsWith('5') || response.startsWith('4')) {
                console.error('SMTP Error:', response.trim());
                socket.end();
                return resolve(false);
            }

            if (step === 0 && response.startsWith('220')) {
                send(`EHLO ${host}`);
                step = 1;
            } else if (step === 1 && response.startsWith('250')) {
                // EHLO response can be multi-line. We split by line and check if the last line does not contain a hyphen.
                const lines = response.trim().split(/\r?\n/);
                const lastLine = lines[lines.length - 1];
                if (lastLine.startsWith('250') && !lastLine.startsWith('250-')) {
                    send('AUTH LOGIN');
                    step = 2;
                }
            } else if (step === 2 && response.startsWith('334')) {
                send(Buffer.from(user).toString('base64'));
                step = 3;
            } else if (step === 3 && response.startsWith('334')) {
                send(Buffer.from(pass).toString('base64'));
                step = 4;
            } else if (step === 4 && response.startsWith('235')) {
                send(`MAIL FROM:<${user}>`);
                step = 5;
            } else if (step === 5 && response.startsWith('250')) {
                send(`RCPT TO:<${toEmail}>`);
                step = 6;
            } else if (step === 6 && response.startsWith('250')) {
                send('DATA');
                step = 7;
            } else if (step === 7 && response.startsWith('354')) {
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
            } else if (step === 8 && response.startsWith('250')) {
                send('QUIT');
                step = 9;
                resolve(true);
            }
        });

        socket.on('error', (err) => {
            console.error('SMTP Socket Error:', err.message);
            resolve(false);
        });

        socket.on('end', () => {
            // Connection closed
        });
    });
};
