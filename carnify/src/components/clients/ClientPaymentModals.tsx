"use client";

import { X, AlertTriangle, ArrowUpRight, ReceiptText, Download, Calendar, Archive, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { ClientProfile, ClientMovement } from "@/stores/useClientStore";

const PAYMENT_METHODS = [
  { id: "cash", label: "Efectivo", icon: "💵" },
  { id: "transfer", label: "Transferencia", icon: "📱" },
  { id: "card", label: "Tarjeta", icon: "💳" },
  { id: "other", label: "Otro", icon: "🔖" },
];

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", other: "Otro",
};
const METHOD_ICONS: Record<string, string> = {
  cash: "💵", transfer: "📱", card: "💳", other: "🔖",
};

interface PaymentForm {
  amount: string;
  note: string;
  method: string;
}

interface SaleForm {
  amount: string;
  description: string;
}

interface PaymentModalProps {
  client: ClientProfile;
  form: PaymentForm;
  onChange: (f: PaymentForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  error?: string | null;
  busy?: boolean;
}

function PaymentModal({ client, form, onChange, onSubmit, onClose, error, busy }: PaymentModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Ingresar Pago</h3>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} className="modal__body">
          <ClientMiniCard client={client} balance={client.balance} />

          <div className="form-group">
            <label className="form-label">Monto a abonar *</label>
            <div className="amount-input-wrap">
              <span className="amount-input-prefix">$</span>
              <input
                className="form-input form-input--amount"
                type="number" min={0.01} step={0.01} required
                placeholder="0" autoFocus
                value={form.amount}
                onChange={(e) => onChange({ ...form, amount: e.target.value })}
              />
            </div>
            {client.balance > 0 && (
              <div className="quick-amounts">
                {[
                  { label: "Saldar todo", value: client.balance },
                  ...(client.balance >= 2000 ? [{ label: "50%", value: Math.ceil(client.balance / 2) }] : []),
                  ...(client.balance > 10000 ? [{ label: "$10.000", value: 10000 }] : []),
                  ...(client.balance > 5000 ? [{ label: "$5.000", value: 5000 }] : []),
                ].map((q) => (
                  <button key={q.label} type="button" className="quick-amount-btn"
                    onClick={() => onChange({ ...form, amount: String(q.value) })}>
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Método de pago</label>
            <div className="method-options">
              {PAYMENT_METHODS.map((m) => (
                <label key={m.id} className={`method-option ${form.method === m.id ? "method-option--active" : ""}`}>
                  <input type="radio" name="method" value={m.id} checked={form.method === m.id}
                    onChange={() => onChange({ ...form, method: m.id })} />
                  <span className="method-option__icon">{m.icon}</span>
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Observación</label>
            <input className="form-input" placeholder="Ej: Pago cuota marzo..."
              value={form.note}
              onChange={(e) => onChange({ ...form, note: e.target.value })} />
          </div>

          {error && (
            <div className="alert alert--danger" style={{ marginBottom: 0 }}>
              <span>{error}</span>
            </div>
          )}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--success" disabled={busy}>
              <ReceiptText size={15} /> Registrar y ver boleta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ReceiptModalProps {
  client: ClientProfile;
  movement: ClientMovement;
  prevBalance: number;
  onDownload: () => void;
  onClose: () => void;
}

function ReceiptModal({ client, movement, prevBalance, onDownload, onClose }: ReceiptModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--receipt" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Pago registrado</h3>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal__body">
          <ReceiptPreview client={client} movement={movement} prevBalance={prevBalance} />
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={onClose}>Cerrar</button>
            <button className="btn btn--outline" onClick={onDownload}>
              <Download size={15} /> Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptPreview({ client, movement, prevBalance }: { client: ClientProfile; movement: ClientMovement; prevBalance: number }) {
  return (
    <div className="receipt-card">
      <div className="receipt-header">
        <div className="receipt-logo">🥩 CARNIFY</div>
        <div className="receipt-title">COMPROBANTE DE PAGO</div>
        <div className="receipt-meta">
          N° {movement.id.slice(-8).toUpperCase()}
          <span>·</span>
          {new Date(movement.date).toLocaleDateString("es-AR")} {new Date(movement.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <div className="receipt-divider" />
      <div className="receipt-section">
        <div className="receipt-label">CLIENTE</div>
        <div className="receipt-client-name">{client.name}</div>
        <div className="receipt-client-meta">
          DNI: {client.dni}
          {client.phone && ` · Tel: ${client.phone}`}
        </div>
      </div>
      <div className="receipt-divider" />
      <div className="receipt-section">
        <div className="receipt-label">CONCEPTO</div>
        <div className="receipt-concept">{movement.description}</div>
        <div className="receipt-method">
          {METHOD_ICONS[movement.paymentMethod || "cash"]} {METHOD_LABELS[movement.paymentMethod || "cash"] || "Efectivo"}
        </div>
      </div>
      <div className="receipt-divider" />
      <div className="receipt-amounts">
        <div className="receipt-amount-row">
          <span>Saldo anterior</span>
          <span>{formatCurrency(prevBalance)}</span>
        </div>
        <div className="receipt-amount-row receipt-amount-row--paid">
          <span>Monto abonado</span>
          <span>− {formatCurrency(movement.amount)}</span>
        </div>
        <div className="receipt-divider receipt-divider--dark" />
        <div className={`receipt-amount-row receipt-amount-row--total ${movement.balanceAfter > 0 ? "text-danger" : "text-success"}`}>
          <span>SALDO RESTANTE</span>
          <span>{formatCurrency(movement.balanceAfter)}</span>
        </div>
      </div>
      <div className="receipt-divider" />
      <div className="receipt-footer">Gracias por su preferencia · Documento informativo</div>
    </div>
  );
}

interface SaleModalProps {
  client: ClientProfile;
  form: SaleForm;
  onChange: (f: SaleForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  error?: string | null;
  busy?: boolean;
}

function SaleModal({ client, form, onChange, onSubmit, onClose, error, busy }: SaleModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Venta a Cuenta Corriente</h3>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} className="modal__body">
          <div className="client-mini-card">
            <div className="mini-avatar">{client.name.charAt(0)}</div>
            <div>
              <div className="mini-name">{client.name}</div>
              <div className="mini-balance">
                Disponible: <strong className={client.creditLimit <= 0 || client.creditLimit - client.balance > 0 ? "text-success" : "text-danger"}>
                  {client.creditLimit > 0 ? formatCurrency(Math.max(0, client.creditLimit - client.balance)) : "Sin límite"}
                </strong>
              </div>
            </div>
          </div>

          {client.creditLimit > 0 && client.balance >= client.creditLimit && (
            <div className="alert alert--warning">
              <AlertTriangle size={15} />
              <span>Este cliente ya superó su límite de crédito ({formatCurrency(client.creditLimit)}).</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Importe de la venta *</label>
            <div className="amount-input-wrap">
              <span className="amount-input-prefix">$</span>
              <input
                className="form-input form-input--amount"
                type="number" min={0.01} step={0.01} required
                placeholder="0" autoFocus
                value={form.amount}
                onChange={(e) => onChange({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input"
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })} />
          </div>

          {error && (
            <div className="alert alert--danger" style={{ marginBottom: 0 }}>
              <span>{error}</span>
            </div>
          )}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              <ArrowUpRight size={15} /> Registrar venta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ClosePeriodModalProps {
  client: ClientProfile;
  onClosePeriod: (reason: "settled" | "month_end" | "manual") => void;
  onClose: () => void;
}

function ClosePeriodModal({ client, onClosePeriod, onClose }: ClosePeriodModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Cerrar período</h3>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal__body">
          <ClientMiniCard client={client} balance={client.balance} movements={client.movements.length} />
          {client.balance > 0 && (
            <div className="alert alert--warning">
              <AlertTriangle size={15} />
              <span>El cliente tiene saldo pendiente de <strong>{formatCurrency(client.balance)}</strong>. El período se archivará con ese saldo.</span>
            </div>
          )}
          <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>
            Los movimientos actuales se moverán al historial. La cuenta quedará en cero movimientos activos.
          </p>
          <div className="close-period-options">
            <button className="close-period-btn" onClick={() => onClosePeriod("month_end")}>
              <Calendar size={18} />
              <div>
                <div className="close-period-btn__title">Fin de mes</div>
                <div className="close-period-btn__desc">Cierre por finalización del período mensual</div>
              </div>
            </button>
            <button className="close-period-btn" onClick={() => onClosePeriod("manual")}>
              <Archive size={18} />
              <div>
                <div className="close-period-btn__title">Cierre manual</div>
                <div className="close-period-btn__desc">Archivar período por decisión propia</div>
              </div>
            </button>
          </div>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  clientName: string;
  onConfirm: () => void;
  onClose: () => void;
  error?: string | null;
  busy?: boolean;
}

function DeleteConfirmModal({ clientName, onConfirm, onClose, error, busy }: DeleteConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Eliminar cliente</h3>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal__body">
          <div className="alert alert--danger">
            <AlertTriangle size={16} />
            <div>
              <strong>¿Eliminar a {clientName}?</strong>
              <p>Se eliminará el cliente y todos sus movimientos. Esta acción no se puede deshacer.</p>
            </div>
          </div>
          {error && (
            <div className="alert alert--danger">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn--danger" onClick={onConfirm} disabled={busy}>
              <Trash2 size={14} /> Eliminar definitivamente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientMiniCard({ client, balance, movements }: { client: ClientProfile; balance?: number; movements?: number }) {
  return (
    <div className="client-mini-card" style={{ cursor: "default" }}>
      <div className="mini-avatar">{client.name.charAt(0)}</div>
      <div>
        <div className="mini-name">{client.name}</div>
        {balance !== undefined && (
          <div className="mini-balance">
            {movements !== undefined
              ? `${movements} movimientos · Saldo: `
              : `Saldo deudor: `}
            <strong className={balance > 0 ? "text-danger" : "text-success"}>{formatCurrency(balance)}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

export type { PaymentForm, SaleForm };
export { PaymentModal, ReceiptModal, SaleModal, ClosePeriodModal, DeleteConfirmModal };
