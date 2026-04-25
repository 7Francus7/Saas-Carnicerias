import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin } from "better-auth/plugins";
import { prisma } from "./db";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

async function sendResetPasswordEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESET_FROM_EMAIL;
  const replyTo = process.env.RESET_REPLY_TO_EMAIL;

  if (!resendApiKey || !fromEmail) {
    console.warn("[auth] Password reset requested but email provider is not configured.", {
      email,
      url,
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: "Restablece tu contrasena de Carnify",
      reply_to: replyTo ? [replyTo] : undefined,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
          <h1 style="font-size:24px;margin-bottom:12px;color:#B91C1C">Carnify</h1>
          <p style="font-size:16px;line-height:1.6;margin-bottom:16px">
            Recibimos una solicitud para restablecer la contrasena de tu cuenta.
          </p>
          <p style="font-size:16px;line-height:1.6;margin-bottom:24px">
            Si fuiste vos, hace clic en el siguiente boton para elegir una nueva contrasena.
          </p>
          <a
            href="${url}"
            style="display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:700"
          >
            Restablecer contrasena
          </a>
          <p style="font-size:14px;line-height:1.6;margin:24px 0 8px;color:#4B5563">
            Si el boton no funciona, copia y pega este enlace en tu navegador:
          </p>
          <p style="font-size:14px;word-break:break-all;color:#6B7280">${url}</p>
        </div>
      `,
      text: `Restablece tu contrasena de Carnify: ${url}`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`No se pudo enviar el email de recuperacion: ${body}`);
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [
    baseURL,
    "https://saas-carnicerias.vercel.app",
    "https://carnify.vercel.app",
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail({ email: user.email, url });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      membershipLimit: 20,
    }),
    admin(),
  ],
  session: {
    cookieCache: {
      enabled: false,
      maxAge: 60 * 5,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
