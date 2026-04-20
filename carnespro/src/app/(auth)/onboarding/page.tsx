"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Beef, Store } from "lucide-react";
import { orgClient } from "@/lib/auth-client";

export default function OnboardingPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError("");
    setLoading(true);

    try {
      const slug = nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const result = await orgClient.create({ name: nombre.trim(), slug });
      if (result.error) {
        setError(result.error.message ?? "Error al crear la carnicería");
        return;
      }

      // Set as active organization
      await orgClient.setActive({ organizationId: result.data!.id });
      router.push("/");
      router.refresh();
    } catch {
      setError("Error inesperado, intentá de nuevo");
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

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--primary-alpha)", display: "flex",
          alignItems: "center", justifyContent: "center", margin: "0 auto 12px"
        }}>
          <Store size={28} color="var(--primary)" />
        </div>
        <h1 className="auth-title">¡Bienvenido!</h1>
        <p className="auth-subtitle">Creá tu carnicería para empezar</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label className="auth-label">Nombre de la carnicería</label>
          <input
            type="text"
            className="auth-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Carnicería Don Pedro"
            required
            autoFocus
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4, display: "block" }}>
            Podés cambiarlo después en Configuración
          </span>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={loading || !nombre.trim()}
        >
          {loading ? "Creando..." : "Crear mi carnicería"}
        </button>
      </form>
    </div>
  );
}
