import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CarnesPro — Acceso",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      {children}
    </div>
  );
}
