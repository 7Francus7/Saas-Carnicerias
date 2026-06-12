"use client";

import { useState } from "react";
import {
  Hash, Phone, MapPin, Mail, Edit3, Trash2,
  ArrowDownLeft, ArrowUpRight, Wallet, CreditCard,
  CheckCircle2, TrendingUp, History, Archive,
  Info, FileText, Download,
  CheckCheck, ChevronDown, ChevronRight,
  Package, StickyNote,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { ClientProfile } from "@/stores/useClientStore";

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", other: "Otro",
};
const METHOD_ICONS: Record<string, string> = {
  cash: "💵", transfer: "📱", card: "💳", other: "🔖",
};

type TabType = "movements" | "history" | "info";
type MovementFilterType = "all" | "sale" | "payment";

interface ProfileStats {
  totalSales: number;
  totalPaid: number;
  salesCount: number;
}

interface ClientProfilePanelProps {
  client: ClientProfile;
  stats: ProfileStats | null;
  onEdit: () => void;
  onDelete: () => void;
  onPayment: () => void;
  onNewSale: () => void;
  onClosePeriod: () => void;
  onDownloadCartola: () => void;
}

export default function ClientProfilePanel({
  client, stats, onEdit, onDelete, onPayment, onNewSale, onClosePeriod, onDownloadCartola,
}: ClientProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("movements");
  const [movementFilter, setMovementFilter] = useState<MovementFilterType>("all");
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  const filteredMovements = movementFilter === "all"
    ? client.movements
    : client.movements.filter((m) => m.type === movementFilter);

  return (
    <div className="client-details">
      {/* Profile Header */}
      <div className="client-profile-header">
        <div className="profile-hero">
          <div className={`profile-avatar ${client.status === "overdue" ? "avatar--danger" : client.status === "blocked" ? "avatar--muted" : "avatar--default"}`}>
            {client.name.charAt(0)}
          </div>
          <div className="profile-info">
            <div className="profile-title-row">
              <h1>{client.name}</h1>
              <span className={`status-badge status-badge--${client.status}`}>
                {client.status === "active" ? "Activo" : client.status === "overdue" ? "En Mora" : "Bloqueado"}
              </span>
            </div>
            <div className="profile-meta">
              {client.dni && <span><Hash size={13} /> {client.dni}</span>}
              {client.phone && <span><Phone size={13} /> {client.phone}</span>}
              {client.address && <span><MapPin size={13} /> {client.address}</span>}
              {client.email && <span><Mail size={13} /> {client.email}</span>}
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn--ghost btn--sm" onClick={onEdit} title="Editar cliente">
            <Edit3 size={15} /> Editar
          </button>
          <button className="btn btn--ghost btn--sm btn--danger-ghost" onClick={onDelete} title="Eliminar cliente">
            <Trash2 size={15} />
          </button>
          <div className="header-actions__sep" />
          <button className="btn btn--outline" onClick={onPayment}>
            <ArrowDownLeft size={16} /> Ingresar Pago
          </button>
          <button className="btn btn--primary" onClick={onNewSale}>
            <ArrowUpRight size={16} /> Venta Cta/Cte
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card summary-card--main">
          <div className="summary-card__icon"><Wallet size={22} /></div>
          <div>
            {client.balance < 0 ? (
              <>
                <div className="summary-card__label" style={{ color: "var(--success)" }}>Saldo a Favor</div>
                <div className="summary-card__value text-success">
                  {formatCurrency(Math.abs(client.balance))}
                </div>
              </>
            ) : (
              <>
                <div className="summary-card__label">Saldo Deudor</div>
                <div className={`summary-card__value ${client.creditLimit > 0 && client.balance > client.creditLimit ? "text-danger" : ""}`}>
                  {formatCurrency(client.balance)}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="summary-card summary-card--credit">
          <div className="summary-card__icon"><CreditCard size={20} /></div>
          <div>
            <div className="summary-card__label">Límite Crédito</div>
            <div className="summary-card__value">{client.creditLimit > 0 ? formatCurrency(client.creditLimit) : "Sin límite"}</div>
          </div>
        </div>
        <div className="summary-card summary-card--available">
          <div className="summary-card__icon"><CheckCircle2 size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="summary-card__label">Crédito Disponible</div>
            {client.creditLimit <= 0 ? (
              <div className="summary-card__value text-success">Sin límite</div>
            ) : client.balance < 0 ? (
              <>
                <div className="summary-card__value text-success">
                  {formatCurrency(client.creditLimit + Math.abs(client.balance))}
                </div>
                <div className="credit-bar">
                  <div className="credit-bar__fill" style={{ width: "0%" }} />
                </div>
                <div className="credit-bar__label">Límite completo + saldo a favor</div>
              </>
            ) : (
              <>
                <div className={`summary-card__value ${client.balance > client.creditLimit ? "text-danger" : "text-success"}`}>
                  {formatCurrency(Math.max(0, client.creditLimit - client.balance))}
                </div>
                <div className="credit-bar">
                  <div
                    className={`credit-bar__fill ${client.balance > client.creditLimit ? "credit-bar__fill--over" : ""}`}
                    style={{ width: `${Math.min(100, (client.balance / client.creditLimit) * 100)}%` }}
                  />
                </div>
                <div className="credit-bar__label">
                  {Math.min(100, Math.round((client.balance / client.creditLimit) * 100))}% usado
                </div>
              </>
            )}
          </div>
        </div>
        <div className="summary-card summary-card--purchases">
          <div className="summary-card__icon"><TrendingUp size={20} /></div>
          <div>
            <div className="summary-card__label">Total Comprado</div>
            <div className="summary-card__value">{formatCurrency(stats?.totalSales ?? 0)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "movements" ? "tab--active" : ""}`}
          onClick={() => setActiveTab("movements")}
        >
          <History size={15} /> Movimientos
          {client.movements.length > 0 && (
            <span className="tab__count">{client.movements.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === "history" ? "tab--active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <Archive size={15} /> Historial
          {(client.periods ?? []).length > 0 && (
            <span className="tab__count">{(client.periods ?? []).length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === "info" ? "tab--active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          <Info size={15} /> Información
        </button>
      </div>

      {/* Tab: Movimientos */}
      {activeTab === "movements" && (
        <div className="ledger-section">
          <div className="ledger-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h3><History size={16} /> Cuenta Corriente</h3>
              <div className="movement-filters">
                {(["all", "sale", "payment"] as const).map((f) => (
                  <button key={f}
                    className={`mvt-filter ${movementFilter === f ? "mvt-filter--active" : ""}`}
                    onClick={() => setMovementFilter(f)}
                  >
                    {f === "all" ? "Todos" : f === "sale" ? "Ventas" : "Pagos"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {client.movements.length > 0 && (
                <button className="btn btn--outline btn--sm" onClick={onClosePeriod}>
                  <Archive size={14} /> Cerrar período
                </button>
              )}
              <button className="btn btn--outline btn--sm" onClick={onDownloadCartola}>
                <Download size={14} /> Cartola PDF
              </button>
            </div>
          </div>

          {client.movements.length === 0 ? (
            <div className="ledger-empty">
              <FileText size={40} />
              <p>Sin movimientos registrados</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="ledger-empty">
              <FileText size={32} />
              <p>Sin {movementFilter === "sale" ? "ventas" : "pagos"} registrados</p>
            </div>
          ) : (
            <div className="ledger">
              <div className="ledger-thead">
                <span>Fecha</span>
                <span>Descripción</span>
                <span className="text-right">Método</span>
                <span className="text-right">Debe (+)</span>
                <span className="text-right">Haber (−)</span>
                <span className="text-right">Saldo</span>
              </div>
              {filteredMovements.map((m) => (
                <div key={m.id} className={`ledger-row ${m.type === "payment" ? "ledger-row--payment" : ""}`}>
                  <div className="ledger-cell ledger-date">
                    {new Date(m.date).toLocaleDateString("es-AR")}
                    <span className="ledger-time">{new Date(m.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="ledger-cell ledger-desc">
                    <span className={`ledger-type-dot ${m.type === "sale" ? "dot--sale" : "dot--payment"}`} />
                    {m.description}
                    {m.ticketId && <span className="ticket-badge">#{m.ticketId}</span>}
                  </div>
                  <div className="ledger-cell text-right ledger-method">
                    {m.type === "payment" && m.paymentMethod
                      ? <span className="method-tag">{METHOD_ICONS[m.paymentMethod]} {METHOD_LABELS[m.paymentMethod] || m.paymentMethod}</span>
                      : <span className="ledger-muted">—</span>
                    }
                  </div>
                  <div className="ledger-cell text-right ledger-debit">
                    {m.type === "sale"
                      ? <span className="amount-debit">+ {formatCurrency(m.amount)}</span>
                      : <span className="ledger-muted">—</span>
                    }
                  </div>
                  <div className="ledger-cell text-right ledger-credit">
                    {m.type === "payment"
                      ? <span className="amount-credit">− {formatCurrency(m.amount)}</span>
                      : <span className="ledger-muted">—</span>
                    }
                  </div>
                  <div className={`ledger-cell text-right ledger-balance ${m.balanceAfter > 0 ? "text-danger" : "text-success"}`}>
                    {formatCurrency(m.balanceAfter)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {stats && client.movements.length > 0 && (
            <div className="ledger-totals">
              <span>Total comprado: <strong className="text-danger">{formatCurrency(stats.totalSales)}</strong></span>
              <span>Total pagado: <strong className="text-success">{formatCurrency(stats.totalPaid)}</strong></span>
              <span>Saldo actual: <strong className={client.balance > 0 ? "text-danger" : "text-success"}>{formatCurrency(client.balance)}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Tab: Historial */}
      {activeTab === "history" && (
        <div className="history-section">
          {(client.periods ?? []).length === 0 ? (
            <div className="ledger-empty">
              <Archive size={40} />
              <p>Sin períodos cerrados aún</p>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: 280, textAlign: "center" }}>
                Los períodos se archivan automáticamente cuando la deuda queda en cero, o podés cerrarlos manualmente.
              </span>
            </div>
          ) : (
            (client.periods ?? []).map((period) => (
              <div key={period.id} className="period-card">
                <div
                  className="period-card__header"
                  onClick={() => setExpandedPeriod(expandedPeriod === period.id ? null : period.id)}
                >
                  <div className="period-card__left">
                    <div className="period-card__icon">
                      {period.finalBalance === 0 ? <CheckCheck size={16} /> : <Archive size={16} />}
                    </div>
                    <div>
                      <div className="period-card__label">{period.label}</div>
                      <div className="period-card__dates">
                        {new Date(period.openedAt).toLocaleDateString("es-AR")}
                        {" → "}
                        {new Date(period.closedAt).toLocaleDateString("es-AR")}
                      </div>
                    </div>
                  </div>
                  <div className="period-card__right">
                    <span className={`period-badge ${period.closedReason === "settled" ? "period-badge--settled" : period.closedReason === "month_end" ? "period-badge--month" : "period-badge--manual"}`}>
                      {period.closedReason === "settled" ? "Saldado" : period.closedReason === "month_end" ? "Fin de mes" : "Manual"}
                    </span>
                    <div className="period-card__summary">
                      <span className="text-danger">{formatCurrency(period.totalSales)}</span>
                      <span style={{ color: "var(--text-muted)" }}>·</span>
                      <span className="text-success">{formatCurrency(period.totalPaid)}</span>
                    </div>
                    {expandedPeriod === period.id ? <ChevronDown size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />}
                  </div>
                </div>

                {expandedPeriod === period.id && (
                  <div className="period-movements">
                    {period.movements.map((m) => (
                      <div key={m.id} className={`period-movement ${m.type === "payment" ? "period-movement--payment" : ""}`}>
                        <span className={`ledger-type-dot ${m.type === "sale" ? "dot--sale" : "dot--payment"}`} />
                        <div className="period-movement__info">
                          <span className="period-movement__desc">{m.description}</span>
                          <span className="period-movement__date">
                            {new Date(m.date).toLocaleDateString("es-AR")} {new Date(m.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <span className={m.type === "sale" ? "amount-debit" : "amount-credit"}>
                          {m.type === "sale" ? "+" : "−"} {formatCurrency(m.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="period-footer">
                      <span>Saldo final: <strong className={period.finalBalance > 0 ? "text-danger" : "text-success"}>{formatCurrency(period.finalBalance)}</strong></span>
                      <span>{period.movements.length} movimientos</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Info */}
      {activeTab === "info" && (
        <div className="info-section">
          <div className="info-grid">
            <div className="info-card">
              <h4><Package size={15} /> Datos del Cliente</h4>
              <div className="info-rows">
                <div className="info-row"><span>Nombre</span><strong>{client.name}</strong></div>
                <div className="info-row"><span>DNI / CUIT</span><strong>{client.dni || "—"}</strong></div>
                <div className="info-row"><span>Teléfono</span><strong>{client.phone || "—"}</strong></div>
                <div className="info-row"><span>Dirección</span><strong>{client.address || "—"}</strong></div>
                <div className="info-row"><span>Email</span><strong>{client.email || "—"}</strong></div>
                <div className="info-row">
                  <span>Estado</span>
                  <strong className={client.status === "overdue" ? "text-danger" : client.status === "blocked" ? "text-muted" : "text-success"}>
                    {client.status === "active" ? "Activo" : client.status === "overdue" ? "En Mora" : "Bloqueado"}
                  </strong>
                </div>
                <div className="info-row">
                  <span>Cliente desde</span>
                  <strong>{new Date(client.createdAt).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" })}</strong>
                </div>
                <div className="info-row">
                  <span>Última actividad</span>
                  <strong>{new Date(client.lastActivity).toLocaleDateString("es-AR")}</strong>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h4><TrendingUp size={15} /> Estadísticas</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{formatCurrency(stats?.totalSales ?? 0)}</div>
                  <div className="stat-label">Total comprado</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value text-success">{formatCurrency(stats?.totalPaid ?? 0)}</div>
                  <div className="stat-label">Total pagado</div>
                </div>
                <div className="stat-item">
                  <div className={`stat-value ${client.balance > 0 ? "text-danger" : "text-success"}`}>
                    {formatCurrency(client.balance)}
                  </div>
                  <div className="stat-label">Saldo actual</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{stats?.salesCount ?? 0}</div>
                  <div className="stat-label">Compras realizadas</div>
                </div>
              </div>

              {client.notes && (
                <div className="info-notes">
                  <StickyNote size={13} />
                  <span>{client.notes}</span>
                </div>
              )}
            </div>
          </div>

          <button className="btn btn--outline btn--sm info-edit-btn" onClick={onEdit}>
            <Edit3 size={14} /> Editar información
          </button>
        </div>
      )}
    </div>
  );
}
