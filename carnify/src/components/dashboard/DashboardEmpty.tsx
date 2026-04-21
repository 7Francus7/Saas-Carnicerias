"use client";

import { useRouter } from "next/navigation";
import { Store, Plus, ArrowRight, ShoppingBag, Users, Package } from "lucide-react";

export default function DashboardEmpty() {
  const router = useRouter();

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <div className="page-header__left">
          <h1 className="page-header__title">
            Panel de <span>Control</span>
          </h1>
        </div>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        padding: "0 20px",
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "var(--primary-alpha)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}>
          <Store size={40} color="var(--primary)" />
        </div>

        <h2 style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}>
          ¡Bienvenido a Carnify!
        </h2>

        <p style={{
          fontSize: "1rem",
          color: "var(--text-secondary)",
          maxWidth: 400,
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          Tu carnicería aún no está configurada. Creá tu negocio ahora y empezá a gestionar tus ventas, clientes y productos.
        </p>

        <button
          className="btn btn--primary btn--lg"
          onClick={() => router.push("/onboarding")}
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48 }}
        >
          <Plus size={20} />
          Crear mi carnicería
          <ArrowRight size={18} />
        </button>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
          width: "100%",
          maxWidth: 500,
        }}>
          <div style={{
            padding: 20,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-light)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: 0.5,
          }}>
            <ShoppingBag size={24} color="var(--text-muted)" />
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Punto de venta</span>
          </div>
          <div style={{
            padding: 20,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-light)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: 0.5,
          }}>
            <Users size={24} color="var(--text-muted)" />
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Clientes</span>
          </div>
          <div style={{
            padding: 20,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-light)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: 0.5,
          }}>
            <Package size={24} color="var(--text-muted)" />
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Inventario</span>
          </div>
        </div>

        <p style={{
          marginTop: 32,
          fontSize: "0.8rem",
          color: "var(--text-muted)",
        }}>
          Una vez creada tu carnicería, tendrás acceso a todas estas funciones
        </p>
      </div>
    </div>
  );
}