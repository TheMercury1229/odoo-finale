import envVars from "../config/env.js";

/**
 * Sends an organization portal invitation email to a contact.
 *
 * If RESEND_API_KEY is configured in process.env, attempts delivery via Resend.
 * Otherwise, activates the fallback mode: logs the full inviteLink clearly
 * to the server console for immediate development, testing, and demoing.
 */
export async function sendInvitationEmail({
  to,
  inviterName,
  organizationName = "Urban Furniture",
  inviteLink,
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // -------------------------------------------------------------------------
    // FALLBACK ACTIVE: No RESEND_API_KEY configured.
    // Log the full inviteLink directly to the console so developers & testers
    // can copy/open the link without deliverability friction.
    // -------------------------------------------------------------------------
    console.log(`\n======================================================`);
    console.log(`📬 [INVITATION EMAIL FALLBACK] (No RESEND_API_KEY)`);
    console.log(`To:           ${to}`);
    console.log(`Invited by:   ${inviterName || "Urban Furniture Admin"}`);
    console.log(`Organization: ${organizationName}`);
    console.log(`Invite Link:  ${inviteLink}`);
    console.log(`======================================================\n`);
    return;
  }

  try {
    const fromAddress =
      process.env.EMAIL_FROM || "Urban Furniture <onboarding@resend.dev>";
    const inviter = inviterName || "Urban Furniture Team";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject: `You've been invited to ${organizationName}'s Portal`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">Portal Invitation</h2>
            <p style="font-size: 15px; line-height: 1.6;">
              You've been invited to <strong>${organizationName}</strong>'s customer & vendor portal by <strong>${inviter}</strong>.
            </p>
            <p style="font-size: 15px; line-height: 1.6;">
              Through the portal, you can securely review invoices, bills, track payments, and manage your account.
            </p>
            <div style="margin: 32px 0;">
              <a href="${inviteLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
                Set Up Your Portal Account
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
              If the button above does not work, copy and paste this link into your browser:
            </p>
            <p style="color: #64748b; font-size: 12px; word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px;">
              ${inviteLink}
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Resend Delivery Error] Status ${response.status}:`,
        errorText,
      );
      console.log(`[FALLBACK INVITE LINK]: ${inviteLink}`);
    } else {
      console.log(`[INVITATION EMAIL SENT] Successfully delivered to ${to}`);
    }
  } catch (err) {
    console.error("[Email Dispatch Exception]:", err);
    console.log(`[FALLBACK INVITE LINK]: ${inviteLink}`);
  }
}
