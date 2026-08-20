import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'Money Card <onboarding@resend.dev>';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendEmailResult {
  sent: boolean;
  provider: 'resend' | 'console';
  id?: string;
  error?: string;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  userName: string,
  resetLink: string,
  roleName: string = 'User',
): Promise<SendEmailResult> {
  const subject = 'Reset your Money Card password';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Money Card Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 36px 32px; }
    .logo-badge { display: inline-block; background-color: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); color: #c4b5fd; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    h1 { color: #f8fafc; font-size: 22px; font-weight: 700; margin: 0 0 12px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .button-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4); }
    .token-box { background-color: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 12px 14px; font-family: monospace; font-size: 11px; color: #cbd5e1; word-break: break-all; margin: 20px 0; }
    .footer { border-top: 1px solid #1e293b; margin-top: 32px; padding-top: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .warning { color: #fbbf24; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">Money Card Platform</div>
    <h1>Password Recovery</h1>
    <p>Hello <strong>${userName}</strong>,</p>
    <p>A password reset request was initiated for your Money Card account (${roleName}). Click the button below to set a new password:</p>
    
    <div class="button-container">
      <a href="${resetLink}" target="_blank" class="btn">Reset Password</a>
    </div>

    <p class="warning"> This link is valid for <strong>30 minutes</strong> and can only be used once.</p>

    <p>If the button above does not work, copy and paste the following URL into your browser:</p>
    <div class="token-box">${resetLink}</div>

    <div class="footer">
      <p>If you did not request this password reset, please ignore this email. Your account remains secure.</p>
      <p>&copy; 2026 Money Card Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: emailFrom,
        to: toEmail,
        subject,
        html: htmlContent,
      });

      console.log(`[EMAIL_SERVICE] Reset email dispatched via Resend to ${toEmail}. Message ID: ${response.data?.id}`);
      return {
        sent: true,
        provider: 'resend',
        id: response.data?.id || undefined,
      };
    } catch (err: any) {
      console.error(`[EMAIL_SERVICE_ERROR] Failed to send email via Resend:`, err.message);
      console.log(`[PASSWORD_RECOVERY_FALLBACK] Reset Link for ${toEmail}: ${resetLink}`);
      return {
        sent: false,
        provider: 'resend',
        error: err.message,
      };
    }
  } else {
    console.log('\n================================================================');
    console.log(' [DEV EMAIL SIMULATOR] RESEND_API_KEY not configured in .env');
    console.log('----------------------------------------------------------------');
    console.log(`To: ${toEmail} (${userName}) [${roleName}]`);
    console.log(`Subject: ${subject}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log('================================================================\n');

    return {
      sent: true,
      provider: 'console',
    };
  }
}

// Alias for backwards compatibility
export const sendSuperAdminPasswordResetEmail = sendPasswordResetEmail;
