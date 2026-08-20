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
  role: string = 'SUPER_ADMIN',
  organizationName?: string | null,
): Promise<SendEmailResult> {
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Role-tailored subject, heading, and greeting
  const subject = isSuperAdmin
    ? 'Reset your Super Admin password'
    : 'Reset your Organization Admin password';

  const heading = isSuperAdmin
    ? 'Reset your Super Admin password'
    : 'Reset your Organization Admin password';

  const greeting = isSuperAdmin
    ? 'Hello, Platform Super Admin'
    : `Hello, ${userName}`;

  const orgDetailHtml = !isSuperAdmin && organizationName
    ? `<p style="margin: 0 0 16px; font-size: 13px; color: #94a3b8;">Organization: <strong style="color: #e2e8f0;">${organizationName}</strong></p>`
    : '';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 0; }
    .wrapper { width: 100%; padding: 40px 16px; background-color: #0b0f19; box-sizing: border-box; }
    .container { max-width: 520px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px 28px; }
    .brand { font-size: 13px; font-weight: 700; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; }
    h1 { color: #f9fafb; font-size: 20px; font-weight: 600; margin: 0 0 16px; line-height: 1.4; }
    p { color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #7c3aed; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; }
    .expiry-note { font-size: 12px; color: #9ca3af; background-color: #1f2937; border-radius: 6px; padding: 10px 14px; margin: 20px 0; }
    .link-fallback { font-size: 11px; color: #6b7280; word-break: break-all; margin: 16px 0; }
    .footer { border-top: 1px solid #1f2937; margin-top: 28px; padding-top: 16px; text-align: center; color: #4b5563; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand">Money Card Platform</div>
      <h1>${heading}</h1>
      <p><strong>${greeting}</strong>,</p>
      ${orgDetailHtml}
      <p>A password reset request was initiated for your Money Card account. Click the button below to choose a new password:</p>
      
      <div class="btn-container">
        <a href="${resetLink}" target="_blank" class="btn">Reset Password</a>
      </div>

      <div class="expiry-note">
        This password reset link is valid for <strong>30 minutes</strong> and can only be used once.
      </div>

      <p style="font-size: 12px; color: #6b7280;">If the button above does not work, copy and paste this link into your browser:</p>
      <div class="link-fallback">${resetLink}</div>

      <div class="footer">
        <p>If you did not request this password reset, please ignore this email. Your account remains secure.</p>
        <p>&copy; 2026 Money Card. All rights reserved.</p>
      </div>
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

      console.log(`[EMAIL_SERVICE] Reset email dispatched via Resend to ${toEmail} (${role}). Message ID: ${response.data?.id}`);
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
    console.log(`To: ${toEmail} (${userName}) [${role}]`);
    console.log(`Subject: ${subject}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log('================================================================\n');

    return {
      sent: true,
      provider: 'console',
    };
  }
}

export const sendSuperAdminPasswordResetEmail = sendPasswordResetEmail;
