import tls from 'tls';
import net from 'net';

/**
 * Sends a password reset OTP email using raw SMTP (zero dependencies).
 * Supports both port 465 (implicit TLS) and port 587 (STARTTLS).
 * @param {string} toEmail - Recipient email address
 * @param {string} fullName - User's full name for personalization
 * @param {string} otpCode - The 6-digit OTP code
 * @returns {Promise<boolean>} - true if sent successfully
 */
export const sendPasswordResetEmail = async (toEmail, fullName, otpCode) => {
    return new Promise((resolve) => {
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = parseInt(process.env.SMTP_PORT) || 465;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!user || !pass) {
            console.warn('[EMAIL] SMTP credentials not configured. Simulating email send.');
            console.log(`[EMAIL][LOCAL DEV] Password reset code for ${toEmail}: ${otpCode}`);
            return resolve(true);
        }

        console.log(`[EMAIL] Connecting to ${host}:${port} (${port === 465 ? 'Implicit TLS' : 'STARTTLS'})...`);

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

        let step = 0;
        let activeSocket = null;
        let resolved = false;

        // Guard against double-resolving and hanging connections
        const safeResolve = (value) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(connectionTimeout);
                resolve(value);
            }
        };

        // 30-second timeout to prevent infinite hangs
        const connectionTimeout = setTimeout(() => {
            console.error('[EMAIL] SMTP connection timed out after 30 seconds');
            try { if (activeSocket) activeSocket.destroy(); } catch (e) { /* ignore */ }
            safeResolve(false);
        }, 30000);

        const send = (data) => {
            activeSocket.write(data + '\r\n');
        };

        // Core SMTP state machine handler — works after TLS is established
        const handleSmtpData = (data) => {
            const response = data.toString();
            console.log(`[EMAIL] SMTP [step=${step}]:`, response.trim().substring(0, 120));

            // Check for fatal SMTP errors (5xx permanent, 4xx transient)
            const lines = response.trim().split(/\r?\n/);
            const lastLine = lines[lines.length - 1];
            if (lastLine.startsWith('5') || (lastLine.startsWith('4') && step > 1)) {
                console.error('[EMAIL] SMTP fatal error:', response.trim());
                activeSocket.end();
                return safeResolve(false);
            }

            if (step === 0 && response.includes('220')) {
                send(`EHLO ${host}`);
                step = 1;
            } else if (step === 1 && response.includes('250')) {
                // EHLO responses are multi-line. Wait for the final line (no hyphen after 250).
                if (lastLine.startsWith('250') && !lastLine.startsWith('250-')) {
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
            } else if (step === 8 && response.startsWith('250')) {
                console.log(`[EMAIL] ✅ Email sent successfully to ${toEmail}`);
                send('QUIT');
                step = 9;
                safeResolve(true);
            }
        };

        // STARTTLS handler for port 587 — upgrades plain socket to TLS then hands off
        const handleStarttlsData = (data) => {
            const response = data.toString();
            console.log(`[EMAIL] STARTTLS [step=${step}]:`, response.trim().substring(0, 120));

            const lines = response.trim().split(/\r?\n/);
            const lastLine = lines[lines.length - 1];

            if (step === 0 && response.includes('220')) {
                send(`EHLO ${host}`);
                step = 1;
            } else if (step === 1 && response.includes('250')) {
                if (lastLine.startsWith('250') && !lastLine.startsWith('250-')) {
                    send('STARTTLS');
                    step = 2;
                }
            } else if (step === 2 && response.startsWith('220')) {
                // Server accepted STARTTLS — upgrade the plain socket to TLS
                console.log('[EMAIL] Upgrading connection to TLS...');
                activeSocket.removeAllListeners('data');

                const tlsSocket = tls.connect({
                    socket: activeSocket,
                    host: host,
                    rejectUnauthorized: false
                }, () => {
                    console.log('[EMAIL] TLS handshake successful');
                    activeSocket = tlsSocket;
                    step = 0; // Reset state machine — we need a fresh EHLO over TLS
                    activeSocket.on('data', handleSmtpData);
                    send(`EHLO ${host}`);
                    step = 1; // We just sent EHLO, expect 250
                });

                tlsSocket.on('error', (err) => {
                    console.error('[EMAIL] TLS upgrade error:', err.message);
                    safeResolve(false);
                });
            }
        };

        const handleError = (err) => {
            console.error('[EMAIL] Socket error:', err.message);
            safeResolve(false);
        };

        // ── Connection Strategy ──────────────────────────────────────
        // Port 465: Implicit TLS — connect with tls.connect directly
        // Port 587: STARTTLS   — connect with net.connect, negotiate STARTTLS, then upgrade
        if (port === 465) {
            activeSocket = tls.connect({
                host: host,
                port: port,
                rejectUnauthorized: false
            });
            activeSocket.on('data', handleSmtpData);
        } else {
            // Port 587 (or any non-465 port): plain connection + STARTTLS
            activeSocket = net.createConnection({ host, port });
            activeSocket.on('data', handleStarttlsData);
        }

        activeSocket.on('error', handleError);
        activeSocket.on('end', () => {
            console.log('[EMAIL] Connection closed');
        });
    });
};
