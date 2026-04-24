"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Store, Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { signIn, signInSocial } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(searchParams.get("banned") === "1" ? "Tu cuenta ha sido bloqueada. Contactá al administrador." : "");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInSocial({ provider: "google" });
    } catch {
      setError("Error al iniciar con Google");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Completá todos los campos");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError("Email o contraseña incorrectos");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-field">
        <label className="auth-label">Email</label>
        <div className="auth-input-wrap">
          <Mail size={18} className="auth-input-icon" />
          <input
            type="email"
            className="auth-input auth-input--with-icon"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-label">Contraseña</label>
        <div className="auth-input-wrap">
          <Lock size={18} className="auth-input-icon" />
          <input
            type={showPassword ? "text" : "password"}
            className="auth-input auth-input--with-icon"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            className="auth-eye"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="auth-remember">
        <label className="auth-checkbox">
          <input type="checkbox" />
          <span>Recordarme</span>
        </label>
        <Link href="/forgot-password" className="auth-link-small">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button type="submit" className="btn btn--primary btn--full btn--large" disabled={loading}>
        {loading ? <Loader2 size={20} className="animate-spin" /> : "Ingresar"}
      </button>

      <div className="auth-divider">
        <span>o continuá con</span>
      </div>

      <button type="button" className="btn btn--social btn--google" onClick={handleGoogleSignIn} disabled={googleLoading}>
        {googleLoading ? <Loader2 size={20} className="animate-spin" /> : <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </>}
      </button>
    </form>
  );
}

export default function LoginPage() {
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
              <div className="auth-hero__features">
                <div className="auth-hero__feature">
                  <span className="check">✓</span> Control de stock en tiempo real
                </div>
                <div className="auth-hero__feature">
                  <span className="check">✓</span> Punto de venta rápido
                </div>
                <div className="auth-hero__feature">
                  <span className="check">✓</span> Reportes de ventas
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-card__main">
          <div className="auth-logo-mobile">
            <Store size={32} />
            <span>Carnify</span>
          </div>

          <h1 className="auth-title">Bienvenido de nuevo</h1>
          <p className="auth-subtitle">Ingresá a tu cuenta</p>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p className="auth-footer">
            ¿No tenés cuenta?{" "}
            <Link href="/signup" className="auth-link">Registrate gratis</Link>
          </p>
        </div>
      </div>
    </div>
  );
}