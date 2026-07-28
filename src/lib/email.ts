import "server-only";

import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  resendClient ??= new Resend(apiKey);

  return resendClient;
}

export async function sendInvitationEmail(params: {
  to: string;
  clubName: string;
  teamName: string | null;
  roleName: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const client = getResendClient();

  if (!client) {
    console.warn("RESEND_API_KEY ist nicht gesetzt, Einladungs-E-Mail wurde nicht verschickt.");
    return { sent: false };
  }

  const from = process.env.INVITATION_EMAIL_FROM || "VereinDigital <onboarding@resend.dev>";
  const expiresAtLabel = params.expiresAt.toLocaleDateString("de-DE");

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 20px;">Einladung zu ${escapeHtml(params.clubName)}</h1>
      <p>
        Du wurdest als <strong>${escapeHtml(params.roleName)}</strong>${
          params.teamName ? ` fuer das Team <strong>${escapeHtml(params.teamName)}</strong>` : ""
        } zu <strong>${escapeHtml(params.clubName)}</strong> auf VereinDigital eingeladen.
      </p>
      <p>
        <a href="${params.inviteUrl}" style="display: inline-block; padding: 10px 16px; background: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px;">
          Einladung annehmen
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px;">Der Link ist gueltig bis ${expiresAtLabel}.</p>
    </div>
  `;

  try {
    const result = await client.emails.send({
      from,
      to: params.to,
      subject: `Einladung zu ${params.clubName}`,
      html,
    });

    if (result.error) {
      console.error("Einladungs-E-Mail konnte nicht verschickt werden.", result.error);
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    console.error("Einladungs-E-Mail konnte nicht verschickt werden.", error);
    return { sent: false };
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
