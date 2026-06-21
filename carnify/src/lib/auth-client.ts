"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient, multiSessionClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  plugins: [organizationClient(), adminClient(), multiSessionClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  organization: orgClient,
  admin: adminOps,
  multiSession,
} = authClient;

export const signInSocial = authClient.signIn.social;
