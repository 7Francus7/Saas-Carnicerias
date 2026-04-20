"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Beef, Eye, EyeOff } from "lucide-react";
import { signIn } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(searchParams.get("banned") === "1" ? "Tu cuenta ha sido bloqueada. Contactá al administrador." : "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
    <>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            autoFocus
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Contraseña</label>
          <div className="auth-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              className="auth-input"
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
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="auth-footer">
        ¿No tenés cuenta?{" "}
        <Link href="/signup" className="auth-link">Registrate gratis</Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-card">
      <div className="auth-logo">
        <div className="sidebar__logo-icon">
          <Beef size={24} color="white" />
        </div>
        <span className="auth-logo-text">Carnes<span>Pro</span></span>
      </div>

      <h1 className="auth-title">Iniciar sesión</h1>
      <p className="auth-subtitle">Accedé a tu carnicería</p>

      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
