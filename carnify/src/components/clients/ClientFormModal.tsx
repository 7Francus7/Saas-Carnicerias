"use client";

import { X } from "lucide-react";
import type { ClientFormData } from "@/stores/useClientStore";

interface ClientFormModalProps {
  mode: "add" | "edit";
  form: ClientFormData;
  onChange: (f: ClientFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  error?: string | null;
  busy?: boolean;
}

export default function ClientFormModal({ mode, form, onChange, onSubmit, onClose, error, busy }: ClientFormModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{mode === "add" ? "Nuevo Cliente" : "Editar Cliente"}</h3>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} className="modal__body">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nombre completo *</label>
              <input className="form-input" required placeholder="Ej: Juan Pérez"
                value={form.name}
                onChange={(e) => onChange({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">DNI / CUIT</label>
              <input className="form-input" placeholder="20-12345678-9"
                value={form.dni}
                onChange={(e) => onChange({ ...form, dni: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" placeholder="11-4567-8901"
                value={form.phone}
                onChange={(e) => onChange({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="cliente@email.com"
                value={form.email}
                onChange={(e) => onChange({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="form-input" placeholder="Av. Corrientes 1234, CABA"
              value={form.address}
              onChange={(e) => onChange({ ...form, address: e.target.value })} />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Límite de crédito (opcional)</label>
              <input className="form-input" type="number" min={0}
                placeholder="Sin límite por defecto"
                value={form.creditLimit === 1000000 ? "" : form.creditLimit}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({ ...form, creditLimit: val === "" ? 1000000 : parseFloat(val) || 0 });
                }} />
            </div>
            {mode === "edit" && (
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-input form-select"
                  value={form.status}
                  onChange={(e) => onChange({ ...form, status: e.target.value as ClientFormData["status"] })}>
                  <option value="active">Activo</option>
                  <option value="overdue">En Mora</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Notas internas</label>
            <textarea className="form-input form-textarea" placeholder="Preferencias, observaciones..."
              value={form.notes}
              onChange={(e) => onChange({ ...form, notes: e.target.value })} />
          </div>
          {error && (
            <div className="alert alert--danger" style={{ marginBottom: 0 }}>
              <span>{error}</span>
            </div>
          )}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {mode === "add" ? "Crear cliente" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
