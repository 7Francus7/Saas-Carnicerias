"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Shield, Store } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSent(true);
    } catch {
      setError("No pudimos iniciar la recuperacion. Intentalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

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
              <p className="auth-hero__subtitle">Recupera el acceso sin detener la operacion.</p>
            </div>
          </div>
        </div>

        <div className="auth-card__main">
          <div className="auth-logo-mobile">
            <Store size={32} />
            <span>Carnify</span>
          </div>

          <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
            <div
              style={{
                width: 64,
                height: 64,
                background: "rgba(220, 38, 38, 0.1)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Shield size={32} color="var(--primary)" />
            </div>
            <h1 className="auth-title">Recuperar contrasena</h1>
            <p className="auth-subtitle" style={{ marginBottom: 24 }}>
              Introduce tu email y te enviaremos un enlace para elegir una nueva contrasena.
            </p>

            {sent ? (
              <div className="auth-success-box">
                <Mail size={20} />
                <div>
                  <strong>Revisa tu email</strong>
                  <p>
                    Si la cuenta existe, te enviamos un enlace de recuperacion. Revisa tambien spam o promociones.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field" style={{ textAlign: "left" }}>
                  <label className="auth-label">Email</label>
                  <div className="auth-input-wrap">
                    <Mail size={18} className="auth-input-icon" />
                    <input
                      type="email"
                      className="auth-input auth-input--with-icon"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                </div>

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="btn btn--primary btn--full btn--large" disabled={loading}>
                  {loading ? <Loader2 size={20} className="animate-spin" /> : "Enviar enlace de recuperacion"}
                </button>
              </form>
            )}

            <Link
              href="/login"
              className="btn btn--ghost btn--full btn--large"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }}
            >
              <ArrowLeft size={16} /> Volver al inicio de sesion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
