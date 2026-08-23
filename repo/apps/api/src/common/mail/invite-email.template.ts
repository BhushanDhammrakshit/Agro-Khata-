const BRAND_COLOR = '#0f3d5c';
const ACCENT_COLOR = '#0d9488';

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface InviteEmailParams {
  inviteeName: string;
  inviterName: string;
  tenantName: string;
  role: string;
  loginUrl: string;
}

export function buildInviteEmailHtml(params: InviteEmailParams): string {
  const { inviteeName, inviterName, tenantName, role, loginUrl } = params;
  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3f7fa;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7fa;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(15,61,92,0.08);">
            <tr>
              <td style="background:${BRAND_COLOR};padding:28px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">VajaBaki</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;color:#0f172a;">You've been invited to ${esc(tenantName)}</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
                  Hi ${esc(inviteeName)},
                </p>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
                  <strong>${esc(inviterName)}</strong> has added you as a <strong>${esc(role)}</strong> on
                  <strong>${esc(tenantName)}</strong>'s VajaBaki account.
                </p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">
                  Click below to sign in and set up your password.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background:${ACCENT_COLOR};">
                      <a href="${esc(loginUrl)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                        Sign in to VajaBaki
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">
                  If you weren't expecting this invite, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#eef4f8;padding:16px 32px;">
                <p style="margin:0;font-size:12px;color:#64748b;">VajaBaki &middot; Simple billing &amp; ledgers for agri traders</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildInviteEmailText(params: InviteEmailParams): string {
  const { inviteeName, inviterName, tenantName, role, loginUrl } = params;
  return `Hi ${inviteeName},\n\n${inviterName} has added you as a ${role} on ${tenantName}'s VajaBaki account.\n\nSign in here: ${loginUrl}\n\nIf you weren't expecting this invite, you can safely ignore this email.`;
}
