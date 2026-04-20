"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Beef, Eye, EyeOff } from "lucide-react";
import { signUp } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      const result = await signUp.email({ name, email, password });
      if (result.error) {
        setError(result.error.message ?? "Error al crear la cuenta");
      } else {
        router.push("/onboarding");
        router.refresh();
      }
    } catch {
      setError("Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <div className="sidebar__logo-icon">
          <Beef size={24} color="white" />
        </div>
        <span className="auth-logo-text">Carnes<span>Pro</span></span>
      </div>

      <h1 className="auth-title">Crear cuenta</h1>
      <p className="auth-subtitle">Empezá a gestionar tu carnicería hoy</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label className="auth-label">Tu nombre</label>
          <input
            type="text"
            className="auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
            required
            autoFocus
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
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
              placeholder="Mínimo 8 caracteres"
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
          {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
        </button>
      </form>

      <p className="auth-footer">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="auth-link">Iniciá sesión</Link>
      </p>
    </div>
  );
}
