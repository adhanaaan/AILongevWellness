// Branded HTML/plain-text for the post-quiz welcome email. Kept as a pure
// function (no React/email deps) so the serverless function stays lightweight.
// Colours mirror lib/theme/tokens.ts: sage #6B9080, bone #FAF9F4,
// charcoal #1A1C1C. Compliance: wellness framing only, never medical advice.

interface WelcomeEmailArgs {
  firstName?: string;
  /** Absolute URL to the app; when empty the CTA button is omitted. */
  appUrl?: string;
}

const SAGE = "#6B9080";
const BONE = "#FAF9F4";
const CHARCOAL = "#1A1C1C";
const MUTED = "#5B6560";

export function welcomeEmailHtml({ firstName, appUrl }: WelcomeEmailArgs): string {
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi there,";
  const button = appUrl
    ? `<tr><td style="padding: 8px 0 4px;">
         <a href="${escapeHtml(appUrl)}"
            style="display:inline-block;background:${SAGE};color:#ffffff;text-decoration:none;
                   font-weight:600;font-size:16px;padding:14px 28px;border-radius:999px;">
           Upload your report
         </a>
       </td></tr>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${BONE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BONE};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="background:${SAGE};padding:28px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.3px;">AI Wellness</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;color:${CHARCOAL};font-size:16px;">${greeting}</p>
                <h1 style="margin:0 0 12px;color:${CHARCOAL};font-size:24px;line-height:1.25;">
                  Your wellness snapshot is waiting
                </h1>
                <p style="margin:0 0 20px;color:${MUTED};font-size:15px;line-height:1.6;">
                  Thanks for getting started. To unlock your biological age and your vascular,
                  metabolic and mental pillar scores, add a recent lab report — it only takes a
                  moment, and your snapshot sharpens with everything you share.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  ${button}
                </table>
                <p style="margin:20px 0 0;color:${MUTED};font-size:14px;line-height:1.6;">
                  No report handy? You can also connect a wearable or add a body-composition scan
                  anytime from the app.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <hr style="border:none;border-top:1px solid #ECEAE2;margin:0 0 16px;" />
                <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;">
                  This is general wellness information, not medical advice. AI Wellness supports your
                  wellbeing and does not provide diagnosis or treatment.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function welcomeEmailText({ firstName, appUrl }: WelcomeEmailArgs): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const cta = appUrl ? `\nUpload your report: ${appUrl}\n` : "";
  return `${greeting}

Your wellness snapshot is waiting.

Thanks for getting started. To unlock your biological age and your vascular, metabolic and mental pillar scores, add a recent lab report — it only takes a moment, and your snapshot sharpens with everything you share.
${cta}
No report handy? You can also connect a wearable or add a body-composition scan anytime from the app.

—

This is general wellness information, not medical advice. AI Wellness supports your wellbeing and does not provide diagnosis or treatment.`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
