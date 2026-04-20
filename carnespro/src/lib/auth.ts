import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin } from "better-auth/plugins";
import { prisma } from "./db";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [
    baseURL,
    "https://saas-carnicerias.vercel.app",
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
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
      enabled: true,
      maxAge: 60 * 5,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
