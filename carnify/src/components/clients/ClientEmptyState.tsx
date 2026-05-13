"use client";

import { Users, TrendingUp, ShieldAlert, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/constants";

interface ClientEmptyStateProps {
  onAddClient: () => void;
  totalDebt: number;
  totalClients: number;
  overdueCount: number;
}

export default function ClientEmptyState({
  onAddClient, totalDebt, totalClients, overdueCount,
}: ClientEmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Users size={64} strokeWidth={1.5} />
      </div>
      <h2>Gestión de Clientes</h2>
      <p>
        Bienvenido al centro de gestión. Acá podés llevar el control total de cuentas corrientes,
        registrar cobranzas y fidelizar a tus clientes premium.
      </p>
      <div style={{ display: "flex", gap: 16 }}>
        <button className="btn btn--primary btn--large" onClick={onAddClient}>
          <UserPlus size={18} /> Registrar Nuevo Cliente
        </button>
      </div>

      <div style={{
        marginTop: 64, display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 24, maxWidth: 800, width: "100%",
      }}>
        <div style={{ padding: 24, background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-light)" }}>
          <TrendingUp size={24} color="var(--primary)" style={{ marginBottom: 16 }} />
          <h4 style={{ fontWeight: 800, marginBottom: 8 }}>Deuda Total</h4>
          <div style={{ fontSize: "1.25rem", fontWeight: 1000, color: "var(--danger)" }}>{formatCurrency(totalDebt)}</div>
        </div>
        <div style={{ padding: 24, background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-light)" }}>
          <Users size={24} color="var(--primary)" style={{ marginBottom: 16 }} />
          <h4 style={{ fontWeight: 800, marginBottom: 8 }}>Total Clientes</h4>
          <div style={{ fontSize: "1.25rem", fontWeight: 1000 }}>{totalClients}</div>
        </div>
        <div style={{ padding: 24, background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-light)" }}>
          <ShieldAlert size={24} color="var(--danger)" style={{ marginBottom: 16 }} />
          <h4 style={{ fontWeight: 800, marginBottom: 8 }}>En Mora</h4>
          <div style={{ fontSize: "1.25rem", fontWeight: 1000, color: "var(--danger)" }}>{overdueCount}</div>
        </div>
      </div>
    </div>
  );
}
