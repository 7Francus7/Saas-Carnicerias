"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Store } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const callbackURL = searchParams.get("callbackURL") ?? "/login?reset=1";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("El enlace de recuperacion no es valido.");
      return;
    }

    if (password.length < 8) {
      setError("La nueva contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      await authClient.resetPassword({
        newPassword: password,
        token,
      });
      setSuccess(true);
      setTimeout(() => router.push(callbackURL), 1200);
    } catch {
      setError("No pudimos restablecer la contrasena. El enlace puede haber expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ display: "block", maxWidth: 520 }}>
        <div className="auth-card__main">
          <div className="auth-logo">
            <div className="sidebar__logo-icon">
              <Store size={24} color="white" />
            </div>
            <span className="auth-logo-text">Carnify</span>
          </div>

          <h1 className="auth-title">Nueva contrasena</h1>
          <p className="auth-subtitle">Elige una contrasena segura para volver a entrar.</p>

          {success ? (
            <div className="auth-success-box">
              <Lock size={20} />
              <div>
                <strong>Contrasena actualizada</strong>
                <p>Te redirigimos al acceso para que entres con la nueva contrasena.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Nueva contrasena</label>
                <div className="auth-input-wrap">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="auth-input auth-input--with-icon"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimo 8 caracteres"
                    required
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Confirmar contrasena</label>
                <div className="auth-input-wrap">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="auth-input auth-input--with-icon"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repite la contrasena"
                    required
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowConfirmPassword((value) => !value)}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="btn btn--primary btn--full btn--large" disabled={loading}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : "Guardar nueva contrasena"}
              </button>
            </form>
          )}

          <p className="auth-footer">
            <Link href="/login" className="auth-link">Volver al inicio de sesion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
