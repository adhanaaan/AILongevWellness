// Branded HTML/plain-text for the post-quiz welcome email. Pure functions (no
// React/email deps) so the serverless function stays lightweight. Table-based,
// inline-styled, web-safe fonts — the lowest-common-denominator that survives
// Gmail / Outlook / Apple Mail. Colours mirror lib/theme/tokens.ts.
// Compliance: wellness framing only, never medical advice.

interface WelcomeEmailArgs {
  firstName?: string;
  /** Absolute URL to the app; when empty the CTA button is omitted. */
  appUrl?: string;
}

const SAGE = "#6B9080";
const SAGE_DARK = "#40584B";
const SAGE_TINT = "#EAF0EC";
const BONE = "#FAF9F4";
const CHARCOAL = "#1A1C1C";
const MUTED = "#5B6560";
const BORDER = "#ECEAE2";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function pillarChip(label: string): string {
  return `<td align="center" style="padding:0 4px;">
    <div style="background:${SAGE_TINT};border-radius:10px;padding:12px 6px;">
      <div style="font-family:${FONT};font-size:13px;font-weight:600;color:${SAGE_DARK};">${label}</div>
    </div>
  </td>`;
}

function step(n: number, title: string, body: string): string {
  return `<tr>
    <td width="40" valign="top" style="padding:0 0 18px;">
      <div style="width:28px;height:28px;border-radius:14px;background:${SAGE};color:#ffffff;font-family:${FONT};font-size:14px;font-weight:700;line-height:28px;text-align:center;">${n}</div>
    </td>
    <td valign="top" style="padding:0 0 18px;">
      <div style="font-family:${FONT};font-size:15px;font-weight:600;color:${CHARCOAL};line-height:1.4;">${title}</div>
      <div style="font-family:${FONT};font-size:14px;color:${MUTED};line-height:1.55;margin-top:2px;">${body}</div>
    </td>
  </tr>`;
}

export function welcomeEmailHtml({ firstName, appUrl }: WelcomeEmailArgs): string {
  const greeting = firstName ? `Welcome, ${escapeHtml(firstName)}.` : "Welcome.";
  const button = appUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 0;">
         <tr>
           <td align="center" style="border-radius:999px;background:${SAGE};">
             <a href="${escapeHtml(appUrl)}"
                style="display:inline-block;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;padding:15px 36px;border-radius:999px;">
               Upload your first report &rarr;
             </a>
           </td>
         </tr>
       </table>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
  </head>
  <body style="margin:0;padding:0;background:${BONE};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Add a recent lab report to unlock your biological age and pillar scores — reviewed and signed off by your care team.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BONE};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid ${BORDER};">

            <!-- Header -->
            <tr>
              <td style="background:${SAGE};padding:26px 36px;">
                <div style="font-family:${FONT};color:#ffffff;font-size:19px;font-weight:700;letter-spacing:0.3px;">AI Wellness</div>
                <div style="font-family:${FONT};color:rgba(255,255,255,0.82);font-size:12px;letter-spacing:1.2px;text-transform:uppercase;margin-top:3px;">Integrated Longevity Wellness</div>
              </td>
            </tr>

            <!-- Hero -->
            <tr>
              <td style="padding:36px 36px 8px;">
                <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1.4px;color:${SAGE};text-transform:uppercase;">${greeting}</div>
                <h1 style="margin:12px 0 14px;font-family:${FONT};color:${CHARCOAL};font-size:26px;line-height:1.25;font-weight:700;">
                  Your longevity snapshot is ready to build
                </h1>
                <p style="margin:0;font-family:${FONT};color:${MUTED};font-size:15px;line-height:1.6;">
                  You&rsquo;ve taken the first step. Add a recent lab report and your biological age and
                  pillar scores begin to take shape &mdash; the more you share, the sharper and more
                  personal your picture becomes.
                </p>
              </td>
            </tr>

            <!-- Snapshot reveal -->
            <tr>
              <td style="padding:22px 36px 4px;">
                <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.2px;color:${MUTED};text-transform:uppercase;margin-bottom:10px;">What your snapshot reveals</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    ${pillarChip("Vascular")}
                    ${pillarChip("Metabolic")}
                    ${pillarChip("Mental")}
                  </tr>
                </table>
                <p style="margin:12px 0 0;font-family:${FONT};color:${MUTED};font-size:13px;line-height:1.55;">
                  Three pillars of healthy ageing, plus a single biological age &mdash; how your body is
                  really tracking against the years.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:24px 36px 8px;">
                ${button}
              </td>
            </tr>

            <!-- What happens next -->
            <tr>
              <td style="padding:20px 36px 8px;">
                <div style="border-top:1px solid ${BORDER};padding-top:24px;">
                  <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.2px;color:${MUTED};text-transform:uppercase;margin-bottom:16px;">What happens next</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    ${step(1, "Add a recent lab report", "Takes about two minutes. No report to hand? Connect a wearable or add a body-composition scan instead.")}
                    ${step(2, "Your care team reviews it", "A GP and a TCM practitioner personally review your results &mdash; this is not an AI-only read.")}
                    ${step(3, "Your snapshot unlocks", "Your biological age, pillar scores and a few tailored focus areas, ready whenever you are.")}
                  </table>
                </div>
              </td>
            </tr>

            <!-- Trust line -->
            <tr>
              <td style="padding:4px 36px 32px;">
                <div style="background:${SAGE_TINT};border-radius:12px;padding:16px 18px;">
                  <div style="font-family:${FONT};font-size:14px;color:${SAGE_DARK};line-height:1.55;">
                    Every report is <strong>reviewed and signed off by a real clinician</strong> before you
                    see it. That&rsquo;s the difference &mdash; insight you can actually trust.
                  </div>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:0 36px 32px;">
                <div style="border-top:1px solid ${BORDER};padding-top:18px;">
                  <p style="margin:0 0 8px;font-family:${FONT};color:${MUTED};font-size:12px;line-height:1.6;">
                    This is general wellness information, not medical advice. AI Wellness supports your
                    wellbeing and does not provide diagnosis or treatment.
                  </p>
                  <p style="margin:0;font-family:${FONT};color:#98A29B;font-size:12px;line-height:1.6;">
                    You&rsquo;re receiving this because you started your wellness profile with AI Wellness.
                  </p>
                </div>
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
  const greeting = firstName ? `Welcome, ${firstName}.` : "Welcome.";
  const cta = appUrl ? `\nUpload your first report: ${appUrl}\n` : "";
  return `${greeting}

Your longevity snapshot is ready to build.

You've taken the first step. Add a recent lab report and your biological age and pillar scores begin to take shape — the more you share, the sharper and more personal your picture becomes.

What your snapshot reveals: three pillars of healthy ageing — Vascular, Metabolic and Mental — plus a single biological age.
${cta}
What happens next:
1. Add a recent lab report (about two minutes). No report to hand? Connect a wearable or add a body-composition scan instead.
2. Your care team reviews it — a GP and a TCM practitioner personally review your results, not an AI-only read.
3. Your snapshot unlocks — biological age, pillar scores, and a few tailored focus areas.

Every report is reviewed and signed off by a real clinician before you see it. That's the difference — insight you can actually trust.

—

This is general wellness information, not medical advice. AI Wellness supports your wellbeing and does not provide diagnosis or treatment.
You're receiving this because you started your wellness profile with AI Wellness.`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
