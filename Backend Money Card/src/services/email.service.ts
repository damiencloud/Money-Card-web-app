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

export type AccountType = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'STAFF';

export async function sendPasswordResetEmail(
  toEmail: string,
  userName: string,
  resetLink: string,
  accountType: AccountType | string = 'SUPER_ADMIN',
  organizationName?: string | null,
): Promise<SendEmailResult> {
  const isSuperAdmin = accountType === 'SUPER_ADMIN';

  // Role-specific titles, greetings, and subjects per specification
  const subject = isSuperAdmin
    ? 'Reset your Super Admin password'
    : 'Reset your Organization Admin password';

  const heading = isSuperAdmin
    ? 'Reset your Super Admin password'
    : 'Reset your Organization Admin password';

  const greeting = isSuperAdmin
    ? 'Hello, Platform Super Admin'
    : `Hello, ${userName}`;

  const bodyDescription = isSuperAdmin
    ? 'We received a request to reset the password for your Super Admin account.'
    : 'We received a request to reset the password for your Organization Admin account.';

  const orgSectionHtml = (!isSuperAdmin && organizationName)
    ? `
      <div style="margin: 20px 0; padding: 14px 16px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px;">
        <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Organization</div>
        <div style="font-size: 14px; font-weight: 600; color: #f8fafc;">${organizationName}</div>
      </div>
    `
    : '';

  // Minimal, Linear/Stripe-inspired clean transactional email template
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #020617;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f8fafc;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #020617;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #0b0f19;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 36px 32px;
      box-sizing: border-box;
    }
    .brand-header {
      font-size: 12px;
      font-weight: 700;
      color: #8b5cf6;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 24px;
    }
    .divider {
      height: 1px;
      background-color: #1e293b;
      margin: 20px 0 24px;
      border: none;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #f8fafc;
      margin: 0 0 16px;
      line-height: 1.4;
    }
    .greeting {
      font-size: 14px;
      font-weight: 600;
      color: #cbd5e1;
      margin: 0 0 12px;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 16px;
    }
    .cta-container {
      margin: 28px 0;
      text-align: left;
    }
    .btn {
      display: inline-block;
      background-color: #7c3aed;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: 6px;
    }
    .security-note {
      font-size: 12px;
      color: #94a3b8;
      margin: 20px 0 12px;
    }
    .disclaimer {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 20px;
    }
    .fallback-note {
      font-size: 11px;
      color: #64748b;
      margin: 0 0 6px;
    }
    .fallback-url {
      font-size: 11px;
      font-family: monospace;
      color: #94a3b8;
      word-break: break-all;
      background-color: #020617;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 24px;
    }
    .footer {
      font-size: 12px;
      color: #475569;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand-header">MONEY CARD PLATFORM</div>
      
      <div class="divider"></div>

      <h1>${heading}</h1>

      <div class="greeting">${greeting}</div>

      <p>${bodyDescription}</p>

      ${orgSectionHtml}

      <div class="cta-container">
        <a href="${resetLink}" target="_blank" class="btn">Reset Password</a>
      </div>

      <div class="security-note">
        This link expires in <strong>1 hour</strong> and can only be used once.
      </div>

      <div class="disclaimer">
        If you did not request this password reset, you can safely ignore this email.
      </div>

      <div class="fallback-note">
        If the button does not work, copy and paste the link below into your browser:
      </div>
      <div class="fallback-url">
        ${resetLink}
      </div>

      <div class="divider"></div>

      <div class="footer">
        Money Card Platform
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

      console.log(`[EMAIL_SERVICE] Reset email dispatched via Resend to ${toEmail} (${accountType}). Message ID: ${response.data?.id}`);
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
    console.log(`To: ${toEmail} (${userName}) [${accountType}]`);
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
