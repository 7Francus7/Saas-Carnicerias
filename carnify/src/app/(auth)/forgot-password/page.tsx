"use client";

import Link from "next/link";
import { Store, ArrowLeft, Mail, Shield } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-card__side">
          <div className="auth-hero">
            <div className="auth-hero__content">
              <div className="auth-hero__logo">
                <Store size={48} color="white" />
              </div>
              <h1 className="auth-hero__title">Carnify</h1>
              <p className="auth-hero__subtitle">Gestión integral para tu carnicería</p>
            </div>
          </div>
        </div>

        <div className="auth-card__main">
          <div className="auth-logo-mobile">
            <Store size={32} />
            <span>Carnify</span>
          </div>

          <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
            <div style={{
              width: 64, height: 64,
              background: "rgba(220, 38, 38, 0.1)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              <Shield size={32} color="var(--primary)" />
            </div>
            <h1 className="auth-title">Recuperar contraseña</h1>
            <p className="auth-subtitle" style={{ marginBottom: 24 }}>
              El restablecimiento por email no está habilitado. Contactá al administrador del sistema para restablecer tu contraseña.
            </p>

            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
              textAlign: "left",
            }}>
              <Mail size={20} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 2 }}>Administrador del sistema</div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                  Pedile al dueño que restablezca tu contraseña desde el panel de super-admin.
                </div>
              </div>
            </div>

            <Link href="/login" className="btn btn--primary btn--full btn--large" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ArrowLeft size={16} /> Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
