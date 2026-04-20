"use client";

import { useState, useMemo } from "react";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Lock, Unlock,
  X, DollarSign, CreditCard, Smartphone, UserPlus,
  Calculator, QrCode, TrendingUp, Receipt, Users,
  Clock, AlertTriangle, Check, History,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { useCajaStore } from "@/stores/useCajaStore";

const METHODS = [
  { key: "cash",     label: "Efectivo",         Icon: DollarSign,  color: "var(--success)", bg: "var(--success-soft)" },
  { key: "transfer", label: "Transferencia",    Icon: Smartphone,  color: "var(--info)",    bg: "var(--info-soft)" },
  { key: "card",     label: "Tarjeta / Débito", Icon: CreditCard,  color: "var(--warning)", bg: "var(--warning-soft)" },
  { key: "link",     label: "QR / Link Pago",   Icon: QrCode,      color: "#A855F7",        bg: "rgba(168,85,247,0.1)" },
  { key: "fiado",    label: "Cuenta Corriente", Icon: UserPlus,    color: "var(--danger)",  bg: "var(--danger-soft)" },
] as const;

function methodLabel(key: string) {
  return METHODS.find((m) => m.key === key)?.label ?? key;
}
function methodColor(key: string) {
  return METHODS.find((m) => m.key === key)?.color ?? "var(--text-secondary)";
}

const TZ = "America/Argentina/Buenos_Aires";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

// ── History row (reused in two places) ───────────────────────────────────────
function HistoryRow({ s }: { s: import("@/stores/useCajaStore").CajaSession }) {
  const sTotal    = s.ventas.reduce((a, v) => a + v.total, 0);
  const cashSales = s.ventas.reduce((acc, v) => {
    if (v.splits) {
      const split = v.splits.find(sp => sp.method === 'cash');
      return acc + (split ? split.amount : 0);
    }
    return acc + (v.method === 'cash' ? v.total : 0);
  }, 0);
  const sIn  = s.transactions.filter((t) => t.type === "in").reduce((a, t) => a + t.amount, 0);
  const sOut = s.transactions.filter((t) => t.type === "out").reduce((a, t) => a + t.amount, 0);
  const sTeorico = s.startingCash + cashSales + sIn - sOut;

  const hasDiff = s.diffAmount !== undefined;
  const diffCls = !hasDiff ? "" :
    s.diffAmount === 0 ? " caja-history-diff--ok" :
    s.diffAmount! > 0  ? " caja-history-diff--over" : " caja-history-diff--under";
  const diffLabel = !hasDiff ? null :
    s.diffAmount === 0 ? "✓ OK" :
    `${s.diffAmount! > 0 ? "+" : ""}${formatCurrency(s.diffAmount!)}`;

  return (
    <div className="caja-history-item">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: 2 }}>
          {s.closedAt ? fmtDate(s.closedAt) : fmtDate(s.openedAt)}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
          {fmtTime(s.openedAt)} → {s.closedAt ? fmtTime(s.closedAt) : "Aún abierta"} · {s.ventas.length} ventas · Fondo {formatCurrency(s.startingCash)}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.88rem" }}>{formatCurrency(sTotal)}</div>
        {s.realAmounts?.["cash"] !== undefined && (
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Efectivo {formatCurrency(s.realAmounts["cash"])}</div>
        )}
      </div>
      {hasDiff && <div className={`caja-history-diff${diffCls}`}>{diffLabel}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CajaContent() {
  const { currentSession, history, openCaja, closeCaja, addTransaction } = useCajaStore();

  const isOpen       = currentSession !== null;
  const ventas       = currentSession?.ventas       ?? [];
  const transactions = currentSession?.transactions ?? [];
  const startingCash = currentSession?.startingCash ?? 0;
  const openedAt     = currentSession?.openedAt;

  // Derived
  const salesByMethod = useMemo(() => {
    const r: Record<string, number> = { cash: 0, transfer: 0, card: 0, link: 0, fiado: 0 };
    ventas.forEach((v) => {
      if (v.splits) {
        v.splits.forEach(sp => {
          r[sp.method] = (r[sp.method] ?? 0) + sp.amount;
        });
      } else {
        r[v.method] = (r[v.method] ?? 0) + v.total;
      }
    });
    return r;
  }, [ventas]);

  const totalSales = useMemo(() => ventas.reduce((s, v) => s + v.total, 0), [ventas]);
  const totalIn    = useMemo(() => transactions.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalOut   = useMemo(() => transactions.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0), [transactions]);
  const efectivoTeorico = startingCash + (salesByMethod.cash ?? 0) + totalIn - totalOut;
  const txCount  = ventas.length;
  const avgTicket = txCount > 0 ? Math.round(totalSales / txCount) : 0;

  // UI state
  const [openAmount,  setOpenAmount]  = useState("50000");
  const [showMove,    setShowMove]    = useState(false);
  const [moveType,    setMoveType]    = useState<"in" | "out">("in");
  const [moveAmount,  setMoveAmount]  = useState("");
  const [moveReason,  setMoveReason]  = useState("");
  const [moveDone,    setMoveDone]    = useState(false);
  const [showClose,   setShowClose]   = useState(false);
  const [arqueoReal,  setArqueoReal]  = useState("");   // panel rápido (solo efectivo)
  const [closeAmounts, setCloseAmounts] = useState<Record<string, string>>({}); // modal cierre
  const [showHistory, setShowHistory] = useState(false);

  // Panel rápido de arqueo (solo cash)
  const realVal       = parseFloat(arqueoReal.replace(",", ".")) || 0;
  const diff          = arqueoReal !== "" ? realVal - efectivoTeorico : null;

  // Sistema esperado por método (para el modal de cierre)
  const tericoByMethod: Record<string, number> = {
    cash:     efectivoTeorico,
    transfer: salesByMethod.transfer ?? 0,
    card:     salesByMethod.card     ?? 0,
    link:     salesByMethod.link     ?? 0,
  };

  // Diff por método (solo cuando el empleado ingresó un valor)
  const diffByMethod: Record<string, number | null> = {};
  let totalCloseDiff = 0;
  let totalCloseEntered = 0;
  ["cash", "transfer", "card", "link"].forEach((key) => {
    const raw = closeAmounts[key];
    if (raw !== undefined && raw !== "") {
      const real = parseFloat(raw.replace(",", ".")) || 0;
      const d = real - (tericoByMethod[key] ?? 0);
      diffByMethod[key] = d;
      totalCloseDiff += d;
      totalCloseEntered++;
    } else {
      diffByMethod[key] = null;
    }
  });

  function handleOpenCaja() {
    const amount = parseFloat(openAmount.replace(",", "."));
    if (isNaN(amount) || amount < 0) return;
    openCaja(amount);
  }

  function openMove(type: "in" | "out") {
    setMoveType(type); setMoveAmount(""); setMoveReason(""); setMoveDone(false);
    setShowMove(true);
  }

  function handleMovement(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(moveAmount);
    if (isNaN(amount) || amount <= 0) return;
    addTransaction(moveType, amount, moveReason);
    setMoveDone(true);
    setTimeout(() => { setShowMove(false); setMoveDone(false); setMoveAmount(""); setMoveReason(""); }, 1200);
  }

  function handleCloseCaja() {
    const amounts: Record<string, number> = {};
    Object.entries(closeAmounts).forEach(([key, val]) => {
      const n = parseFloat(val.replace(",", "."));
      if (!isNaN(n)) amounts[key] = n;
    });
    closeCaja(amounts);
    setShowClose(false);
    setCloseAmounts({});
  }

  // ── CLOSED STATE ─────────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <div className="page-container">
        <div className="page-header animate-in">
          <div className="page-header__left">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <span className="page-header__greeting">Finanzas</span>
              <span className="caja-status-chip caja-status-chip--closed">
                <span className="caja-status-chip__dot" /> Caja Cerrada
              </span>
            </div>
            <h1 className="page-header__title">Caja y <span>Tesorería</span></h1>
          </div>
          {history.length > 0 && (
            <button className="btn btn--ghost btn--sm" onClick={() => setShowHistory(true)}>
              <History size={14} /> Ver historial
            </button>
          )}
        </div>

        <div className="caja-closed-screen">
          <div className="caja-open-card animate-in">
            <div className="caja-open-card__icon"><Lock size={28} /></div>
            <div className="caja-open-card__title">Caja Cerrada</div>
            <div className="caja-open-card__subtitle">
              Ingresá el fondo inicial para comenzar la sesión de hoy
            </div>

            <div className="form-group" style={{ width: "100%", maxWidth: 300 }}>
              <label className="form-label">Fondo inicial</label>
              <div className="arqueo-input-wrap">
                <span className="arqueo-input-prefix">$</span>
                <input
                  type="number"
                  className="arqueo-input"
                  style={{ fontSize: "1.5rem" }}
                  placeholder="0"
                  value={openAmount}
                  onChange={(e) => setOpenAmount(e.target.value)}
                />
              </div>
            </div>

            <button
              className="btn btn--primary"
              style={{ width: "100%", maxWidth: 300, justifyContent: "center" }}
              onClick={handleOpenCaja}
            >
              <Unlock size={16} /> Abrir Caja
            </button>
          </div>

          {history.length > 0 && (
            <div className="card animate-in animate-in-delay-2" style={{ maxWidth: 600, width: "100%" }}>
              <div className="card__header">
                <div className="card__title">Últimas sesiones</div>
                {history.length > 3 && (
                  <button className="card__action" onClick={() => setShowHistory(true)}>Ver todo</button>
                )}
              </div>
              {history.slice(0, 3).map((s) => <HistoryRow key={s.id} s={s} />)}
            </div>
          )}
        </div>

        {showHistory && <HistoryModal history={history} onClose={() => setShowHistory(false)} />}
      </div>
    );
  }

  // ── OPEN STATE ───────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-in">
        <div className="page-header__left">
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
            <span className="page-header__greeting">Finanzas</span>
            <span className="caja-status-chip caja-status-chip--open">
              <span className="caja-status-chip__dot" /> Caja Abierta
            </span>
            {openedAt && (
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> desde las {fmtTime(openedAt)}
              </span>
            )}
          </div>
          <h1 className="page-header__title">Caja y <span>Tesorería</span></h1>
        </div>
        <div className="page-header__right">
          <button className="btn btn--ghost btn--sm" onClick={() => setShowHistory(true)}>
            <History size={14} /> Historial
          </button>
          <button className="btn btn--secondary btn--sm" onClick={() => openMove("out")}>
            <ArrowUpCircle size={15} /> Retirar
          </button>
          <button className="btn btn--secondary btn--sm" onClick={() => openMove("in")}>
            <ArrowDownCircle size={15} /> Ingresar
          </button>
          <button className="btn btn--danger" onClick={() => { setArqueoReal(""); setShowClose(true); }}>
            <Lock size={15} /> Cerrar Caja
          </button>
        </div>
      </div>

      {/* Stats - Focused on Operation */}
      <div className="stats-grid">
        <div className="stat-card stat-card--revenue animate-in animate-in-delay-1" style={{ gridColumn: "span 4" }}>
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--revenue"><Wallet size={24} /></div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn--sm btn--ghost" onClick={() => setShowHistory(true)}>
                <History size={14} /> Historial de Sesiones
              </button>
            </div>
          </div>
          <div className="stat-card__value" style={{ fontSize: "2.5rem" }}>{formatCurrency(efectivoTeorico)}</div>
          <div className="stat-card__label">Efectivo Total en Caja</div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="caja-two-col">
        <div className="caja-left">

          {/* Manual movements */}
          <div className="card animate-in animate-in-delay-1">
            <div className="card__header">
              <div>
                <div className="card__title">Movimientos de Efectivo</div>
                <div className="card__subtitle">Ingresos y retiros manuales de la sesión actual</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn--sm btn--ghost" onClick={() => openMove("in")}>
                  <ArrowDownCircle size={13} /> Ingreso
                </button>
                <button className="btn btn--sm btn--ghost" onClick={() => openMove("out")}>
                  <ArrowUpCircle size={13} /> Retiro
                </button>
              </div>
            </div>
            <div className="tx-list">
              <div className="tx-fondo-row">
                <span className="tx-fondo-label">Fondo Inicial Apertura</span>
                <span className="tx-fondo-value">{formatCurrency(startingCash)}</span>
              </div>
              {transactions.length === 0 && (
                <div className="empty-state" style={{ padding: "32px 0" }}>
                  <div className="empty-state__title">Sin movimientos manuales</div>
                  <div className="empty-state__desc">Los retiros para proveedores o ingresos extras aparecerán aquí.</div>
                </div>
              )}
              {transactions.map((t) => (
                <div key={t.id} className="tx-item">
                  <div className={`tx-badge tx-badge--${t.type}`}>{t.type === "in" ? "+" : "−"}</div>
                  <div className="tx-info">
                    <div className="tx-reason">{t.reason}</div>
                    <div className="tx-time">{fmtTime(t.timestamp)} hs</div>
                  </div>
                  <div className={`tx-amount tx-amount--${t.type}`}>
                    {t.type === "in" ? "+" : "−"}{formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
              {(totalIn > 0 || totalOut > 0) && (
                <div className="tx-fondo-row" style={{ marginTop: 8, borderTop: "1px dashed var(--border)" }}>
                  <span className="tx-fondo-label">Balance de movimientos</span>
                  <span className="tx-fondo-value" style={{ color: totalIn - totalOut >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {totalIn - totalOut >= 0 ? "+" : ""}{formatCurrency(totalIn - totalOut)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick link to reports */}
          <div className="card animate-in animate-in-delay-2" style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px" }}>
              <div style={{ padding: 12, borderRadius: 12, background: "var(--primary)", color: "white" }}>
                <TrendingUp size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Ventas y Estadísticas</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>El listado detallado de ventas y los reportes de facturación se encuentran en el módulo de reportes.</div>
              </div>
              <a href="/reportes" className="btn btn--primary btn--sm">Ir a Reportes</a>
            </div>
          </div>
        </div>


        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Arqueo */}
          <div className="card animate-in animate-in-delay-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card__header">
              <div>
                <div className="card__title">Arqueo de Caja</div>
                <div className="card__subtitle">Validar efectivo antes del cierre</div>
              </div>
              <Calculator size={16} style={{ color: "var(--text-muted)" }} />
            </div>

            <div className="arqueo-declared">
              <div className="arqueo-declared__label">Efectivo Declarado (sistema)</div>
              <div className="arqueo-declared__value">{formatCurrency(efectivoTeorico)}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Fondo inicial",       value: startingCash,            color: "var(--text-secondary)", sign: "+" },
                { label: "Ventas en efectivo",  value: salesByMethod.cash ?? 0, color: "var(--success)",        sign: "+" },
                { label: "Ingresos manuales",   value: totalIn,                 color: "var(--info)",           sign: "+" },
                { label: "Retiros manuales",    value: totalOut,                color: "var(--danger)",         sign: "−" },
              ].map(({ label, value, color, sign }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color }}>
                    {sign}{formatCurrency(Math.abs(value))}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: "var(--border-light)" }} />

            <div className="form-group">
              <label className="form-label">Efectivo Contado (real)</label>
              <div className="arqueo-input-wrap">
                <span className="arqueo-input-prefix">$</span>
                <input
                  type="number" className="arqueo-input"
                  placeholder="0"
                  value={arqueoReal}
                  onChange={(e) => setArqueoReal(e.target.value)}
                />
              </div>
            </div>

            {diff !== null && (
              <div className={`arqueo-diff arqueo-diff--${diff === 0 ? "ok" : diff > 0 ? "over" : "under"}`}>
                <span>{diff === 0 ? "✓ Sin diferencias" : diff > 0 ? "Sobrante" : "Faltante"}</span>
                <span className="arqueo-diff__value">
                  {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${formatCurrency(diff)}`}
                </span>
              </div>
            )}

            <button
              className="btn btn--danger btn--full"
              style={{ justifyContent: "center" }}
              onClick={() => setShowClose(true)}
            >
              <Lock size={16} /> Cerrar Caja
            </button>
          </div>

          {/* History mini */}
          {history.length > 0 && (
            <div className="card animate-in animate-in-delay-3">
              <div className="card__header">
                <div className="card__title">Sesiones Anteriores</div>
                {history.length > 3 && (
                  <button className="card__action" onClick={() => setShowHistory(true)}>Ver todo</button>
                )}
              </div>
              {history.slice(0, 3).map((s) => <HistoryRow key={s.id} s={s} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Movimiento ── */}
      {showMove && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">
                {moveType === "in" ? "Ingreso de Fondos" : "Retiro de Efectivo"}
              </h3>
              <button className="modal__close" onClick={() => setShowMove(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleMovement} className="modal__content">
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "18px", borderRadius: "var(--radius-md)", marginBottom: 20,
                background: moveType === "in" ? "var(--success-soft)" : "var(--danger-soft)",
                color: moveType === "in" ? "var(--success)" : "var(--danger)", gap: 8,
              }}>
                {moveType === "in" ? <ArrowDownCircle size={30} /> : <ArrowUpCircle size={30} />}
                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  Este movimiento afectará el saldo de efectivo en caja.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Monto</label>
                <div className="input-with-icon">
                  <span className="input-icon-text">$</span>
                  <input
                    type="number" className="form-input" required autoFocus
                    style={{ paddingLeft: 42, fontSize: "1.8rem", fontFamily: "var(--font-mono)", fontWeight: 800 }}
                    placeholder="0"
                    value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Concepto</label>
                <input
                  type="text" className="form-input" required
                  placeholder="Ej: Pago flete, Cambio inicial, Retiro propietario..."
                  value={moveReason} onChange={(e) => setMoveReason(e.target.value)}
                />
              </div>

              {moveDone && (
                <div className="arqueo-diff arqueo-diff--ok" style={{ marginBottom: 14 }}>
                  <span><Check size={14} /> Movimiento registrado</span>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowMove(false)}>Cancelar</button>
                <button type="submit" className={`btn btn--${moveType === "in" ? "success" : "danger"} btn--full`}>
                  Confirmar {moveType === "in" ? "Ingreso" : "Retiro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Cerrar Caja ── */}
      {showClose && (
        <div className="modal-overlay" onClick={() => setShowClose(false)}>
          <div className="modal modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--danger-soft)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock size={15} />
                </div>
                <div>
                  <h3 className="modal__title" style={{ marginBottom: 0 }}>Cierre de Caja</h3>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 1 }}>
                    {openedAt ? `Sesión desde las ${fmtTime(openedAt)}` : "Sesión actual"}
                    {" · "}{txCount} venta{txCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <button className="modal__close" onClick={() => setShowClose(false)}><X size={18} /></button>
            </div>
            <div className="modal__content">
              <div className="caja-close-grid">

                {/* Left: session summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Summary */}
                  <div>
                    <div className="caja-close-label">Resumen de sesión</div>
                    <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", overflow: "hidden" }}>
                      {[
                        { label: "Total facturado", value: formatCurrency(totalSales), bold: true },
                        { label: "Fondo inicial",   value: formatCurrency(startingCash), bold: false },
                        ...(totalIn > 0  ? [{ label: "Ingresos manuales", value: `+${formatCurrency(totalIn)}`,  bold: false }] : []),
                        ...(totalOut > 0 ? [{ label: "Retiros manuales",  value: `−${formatCurrency(totalOut)}`, bold: false }] : []),
                      ].map(({ label, value, bold }, i) => (
                        <div key={label} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 12px", fontSize: "0.82rem",
                          borderTop: i > 0 ? "1px solid var(--border-light)" : "none",
                          background: bold ? "var(--surface)" : "transparent",
                        }}>
                          <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: bold ? 800 : 600, color: bold ? "var(--text-primary)" : "var(--text-secondary)" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment breakdown */}
                  <div>
                    <div className="caja-close-label">Ventas por medio de pago</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {METHODS.map(({ key, label, color }) => {
                        const amount = salesByMethod[key] ?? 0;
                        const pct = totalSales > 0 ? Math.round((amount / totalSales) * 100) : 0;
                        return (
                          <div key={key} className="caja-method-mini">
                            <span className="caja-method-mini__label">
                              <span className="caja-method-mini__dot" style={{ background: color }} />
                              {label}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{pct}%</span>
                              <span className="caja-method-mini__value" style={{ color }}>{formatCurrency(amount)}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                      <div className="caja-method-mini">
                        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.82rem" }}>Total</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.88rem" }}>{formatCurrency(totalSales)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: verificación por medio de pago */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="caja-close-label" style={{ marginBottom: 2 }}>
                    Verificación por medio de pago
                  </div>

                  {/* Cash — sin monto esperado visible */}
                  {(() => {
                    const d = diffByMethod["cash"];
                    const val = closeAmounts["cash"] ?? "";
                    return (
                      <div className="caja-verify-card">
                        <div className="caja-verify-card__icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                          <DollarSign size={15} />
                        </div>
                        <div className="caja-verify-card__body">
                          <div className="caja-verify-card__name">Efectivo</div>
                          <div className="caja-verify-card__hint">Contá billetes y monedas físicamente</div>
                        </div>
                        <div className="caja-verify-card__input-wrap">
                          {d !== null && (
                            <div className={`caja-verify-diff caja-verify-diff--${d === 0 ? "ok" : d > 0 ? "over" : "under"}`}>
                              {d === 0 ? "✓" : d > 0 ? `+${formatCurrency(d)}` : formatCurrency(d)}
                            </div>
                          )}
                          <span className="caja-verify-card__prefix">$</span>
                          <input
                            type="number" className="caja-verify-card__input"
                            placeholder="0" autoFocus
                            value={val}
                            onChange={(e) => setCloseAmounts((p) => ({ ...p, cash: e.target.value }))}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Transfer, card, link — monto sistema visible */}
                  {([
                    { key: "transfer", label: "Transferencia",    Icon: Smartphone, color: "var(--info)",    bg: "var(--info-soft)",    hint: "Verificá extracto bancario o app" },
                    { key: "card",     label: "Tarjeta / Débito", Icon: CreditCard, color: "var(--warning)", bg: "var(--warning-soft)", hint: "Verificá resumen de la terminal" },
                    { key: "link",     label: "QR / Link Pago",   Icon: QrCode,     color: "#A855F7",        bg: "rgba(168,85,247,0.1)", hint: "Verificá la plataforma de cobros" },
                  ] as const).map(({ key, label, Icon, color, bg, hint }) => {
                    const sistema = tericoByMethod[key] ?? 0;
                    const d = diffByMethod[key];
                    const val = closeAmounts[key] ?? "";
                    return (
                      <div key={key} className="caja-verify-card">
                        <div className="caja-verify-card__icon" style={{ background: bg, color }}>
                          <Icon size={15} />
                        </div>
                        <div className="caja-verify-card__body">
                          <div className="caja-verify-card__name">{label}</div>
                          <div className="caja-verify-card__hint">{hint}</div>
                          <div className="caja-verify-card__sistema">Sistema: {formatCurrency(sistema)}</div>
                        </div>
                        <div className="caja-verify-card__input-wrap">
                          {d !== null && (
                            <div className={`caja-verify-diff caja-verify-diff--${d === 0 ? "ok" : d > 0 ? "over" : "under"}`}>
                              {d === 0 ? "✓" : d > 0 ? `+${formatCurrency(d)}` : formatCurrency(d)}
                            </div>
                          )}
                          <span className="caja-verify-card__prefix">$</span>
                          <input
                            type="number" className="caja-verify-card__input"
                            placeholder="0"
                            value={val}
                            onChange={(e) => setCloseAmounts((p) => ({ ...p, [key]: e.target.value }))}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Fiado — sin input */}
                  <div className="caja-verify-card caja-verify-card--info">
                    <div className="caja-verify-card__icon" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                      <UserPlus size={15} />
                    </div>
                    <div className="caja-verify-card__body">
                      <div className="caja-verify-card__name">Cuenta Corriente</div>
                      <div className="caja-verify-card__hint">Sin verificación física</div>
                    </div>
                    <div className="caja-verify-card__input-wrap" style={{ borderLeft: "none" }}>
                      <span className="caja-verify-card__amount" style={{ color: "var(--danger)" }}>
                        {formatCurrency(salesByMethod.fiado ?? 0)}
                      </span>
                    </div>
                  </div>

                  {/* Total diff */}
                  {totalCloseEntered > 0 && (
                    <div className={`caja-verify-total caja-verify-total--${totalCloseDiff === 0 ? "ok" : totalCloseDiff > 0 ? "over" : "under"}`}>
                      <span className="caja-verify-total__label">
                        {totalCloseDiff === 0 ? "✓ Todo cuadra" : totalCloseDiff > 0 ? "Sobrante total" : "Faltante total"}
                      </span>
                      <span className="caja-verify-total__value">
                        {totalCloseDiff === 0 ? "Sin diferencias" : `${totalCloseDiff > 0 ? "+" : ""}${formatCurrency(totalCloseDiff)}`}
                      </span>
                    </div>
                  )}

                  {totalCloseEntered > 0 && totalCloseDiff !== 0 && (
                    <div style={{ padding: "9px 12px", borderRadius: "var(--radius-md)", background: "var(--warning-soft)", border: "1px solid var(--warning-border)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <AlertTriangle size={13} style={{ color: "var(--warning)", marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.73rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        La diferencia quedará registrada en el historial de sesiones.
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                    <button
                      className="btn btn--danger btn--full"
                      style={{ justifyContent: "center", fontWeight: 700 }}
                      onClick={handleCloseCaja}
                    >
                      <Lock size={15} /> Confirmar Cierre
                    </button>
                    <button
                      className="btn btn--ghost btn--full"
                      style={{ justifyContent: "center" }}
                      onClick={() => setShowClose(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Historial ── */}
      {showHistory && <HistoryModal history={history} onClose={() => setShowHistory(false)} />}
    </div>
  );
}

// ── History full modal ────────────────────────────────────────────────────────
function HistoryModal({
  history,
  onClose,
}: {
  history: import("@/stores/useCajaStore").CajaSession[];
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Historial de Sesiones</h3>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal__content">
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">Sin sesiones previas</div>
              <div className="empty-state__desc">Las sesiones cerradas aparecerán aquí.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((s) => <HistoryRow key={s.id} s={s} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
