"use client";

import { useState, useRef, useEffect } from "react";
import {
  Store, ShoppingCart, Palette, Database, Info,
  Save, Check, Download, Upload, Trash2, AlertTriangle,
  Building2, Phone, Mail, MapPin, Hash,
  Sun, Moon, Globe, X,
} from "lucide-react";
import {
  useSettingsStore,
  DEFAULT_BUSINESS,
  DEFAULT_POS,
  type BusinessSettings,
  type PosSettings,
} from "@/stores/useSettingsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { PAYMENT_METHODS } from "@/lib/constants";

type TabId = "negocio" | "pos" | "apariencia" | "datos" | "acerca";

const TABS: { id: TabId; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "negocio",    label: "Negocio",        Icon: Store },
  { id: "pos",        label: "Punto de Venta", Icon: ShoppingCart },
  { id: "apariencia", label: "Apariencia",     Icon: Palette },
  { id: "datos",      label: "Datos",          Icon: Database },
  { id: "acerca",     label: "Acerca de",      Icon: Info },
];

const STORE_KEYS = [
  "carnespro-settings",
  "carnespro-theme",
  "carnespro-products",
  "carnespro-clients",
  "carnespro-costos",
  "staff-storage",
] as const;

type StoreKey = (typeof STORE_KEYS)[number];

const STORE_LABELS: Record<StoreKey, string> = {
  "carnespro-settings": "Configuración",
  "carnespro-theme": "Apariencia",
  "carnespro-products": "Productos",
  "carnespro-clients": "Clientes",
  "carnespro-costos": "Costos",
  "staff-storage": "Personal",
};

type ResetTarget = StoreKey | "all";

const TECH_STACK = [
  { label: "Framework",      value: "Next.js 16" },
  { label: "UI",             value: "React 19" },
  { label: "Estado",         value: "Zustand 5" },
  { label: "Gráficos",       value: "Recharts 3" },
  { label: "PDF",            value: "jsPDF 4" },
  { label: "Iconos",         value: "Lucide React" },
  { label: "Tipografía",     value: "Outfit · Inter · JetBrains Mono" },
  { label: "Almacenamiento", value: "localStorage via Zustand persist" },
];

export default function ConfigContent() {
  const { business, pos, updateBusiness, updatePos } = useSettingsStore();
  const { theme, toggleTheme } = useThemeStore();

  const [activeTab, setActiveTab]   = useState<TabId>("negocio");
  const [savedTab, setSavedTab]     = useState<TabId | null>(null);
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "ok" | "error">("idle");

  const [bizForm, setBizForm] = useState<BusinessSettings>({ ...DEFAULT_BUSINESS });
  const [posForm, setPosForm] = useState<PosSettings>({ ...DEFAULT_POS });

  // Sync form state after Zustand hydrates from localStorage
  useEffect(() => {
    setBizForm({ ...useSettingsStore.getState().business });
    setPosForm({ ...useSettingsStore.getState().pos });
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function showSaved(tab: TabId) {
    setSavedTab(tab);
    setTimeout(() => setSavedTab(null), 2500);
  }

  function saveBusiness() {
    const cleaned: BusinessSettings = {
      ...bizForm,
      iniciales: (bizForm.iniciales.trim() || "CP").slice(0, 3).toUpperCase(),
    };
    updateBusiness(cleaned);
    setBizForm(cleaned);
    showSaved("negocio");
  }

  function savePos() {
    updatePos(posForm);
    showSaved("pos");
  }

  function exportData() {
    const snapshot: Record<string, unknown> = {
      _version: "1.0",
      _exported_at: new Date().toISOString(),
    };
    STORE_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try { snapshot[key] = JSON.parse(raw); } catch { snapshot[key] = raw; }
      }
    });
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `carnespro-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        STORE_KEYS.forEach((key) => {
          if (data[key] != null) localStorage.setItem(key, JSON.stringify(data[key]));
        });
        setImportStatus("ok");
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setImportStatus("error");
        setTimeout(() => setImportStatus("idle"), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function confirmReset() {
    if (!resetTarget) return;
    if (resetTarget === "all") {
      STORE_KEYS.forEach((key) => localStorage.removeItem(key));
    } else {
      localStorage.removeItem(resetTarget);
    }
    window.location.reload();
  }

  const resetTargetLabel =
    resetTarget === "all"
      ? "todo el sistema"
      : resetTarget
      ? STORE_LABELS[resetTarget as StoreKey]?.toLowerCase()
      : "";

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__left">
          <div className="page-header__greeting">Sistema</div>
          <div className="page-header__title">Configuración</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="config-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`config-tab${activeTab === id ? " config-tab--active" : ""}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="config-body">

        {/* ══ NEGOCIO ══ */}
        {activeTab === "negocio" && (
          <div className="config-section animate-in">
            <div className="card">
              <div className="config-card-header">
                <div>
                  <div className="card__title">Información del Negocio</div>
                  <div className="card__subtitle">Datos que aparecen en recibos y comprobantes</div>
                </div>
                {savedTab === "negocio" && (
                  <span className="config-saved-badge">
                    <Check size={12} /> Guardado
                  </span>
                )}
              </div>

              <div className="config-grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre del negocio</label>
                  <div className="config-input-wrap">
                    <Building2 size={14} className="config-input-icon" />
                    <input
                      className="form-input config-input-padded"
                      value={bizForm.nombre}
                      onChange={(e) => setBizForm((f) => ({ ...f, nombre: e.target.value }))}
                      placeholder="Ej: La Carnicería de Don Juan"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Iniciales{" "}
                    <span className="config-label-hint">(máx. 3 — avatar del sidebar)</span>
                  </label>
                  <input
                    className="form-input"
                    value={bizForm.iniciales}
                    maxLength={3}
                    onChange={(e) =>
                      setBizForm((f) => ({ ...f, iniciales: e.target.value.toUpperCase() }))
                    }
                    placeholder="CP"
                    style={{
                      textTransform: "uppercase",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.12em",
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <div className="config-input-wrap">
                    <MapPin size={14} className="config-input-icon" />
                    <input
                      className="form-input config-input-padded"
                      value={bizForm.direccion}
                      onChange={(e) => setBizForm((f) => ({ ...f, direccion: e.target.value }))}
                      placeholder="Av. Corrientes 1234, CABA"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <div className="config-input-wrap">
                    <Phone size={14} className="config-input-icon" />
                    <input
                      className="form-input config-input-padded"
                      value={bizForm.telefono}
                      onChange={(e) => setBizForm((f) => ({ ...f, telefono: e.target.value }))}
                      placeholder="11-4567-8901"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">CUIT / CUIL</label>
                  <div className="config-input-wrap">
                    <Hash size={14} className="config-input-icon" />
                    <input
                      className="form-input config-input-padded"
                      value={bizForm.cuit}
                      onChange={(e) => setBizForm((f) => ({ ...f, cuit: e.target.value }))}
                      placeholder="20-12345678-9"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email de contacto</label>
                  <div className="config-input-wrap">
                    <Mail size={14} className="config-input-icon" />
                    <input
                      className="form-input config-input-padded"
                      type="email"
                      value={bizForm.email}
                      onChange={(e) => setBizForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="contacto@carniceria.com"
                    />
                  </div>
                </div>
              </div>

              <div className="config-card-footer">
                <button className="btn btn--primary" onClick={saveBusiness}>
                  <Save size={13} /> Guardar cambios
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => setBizForm({ ...useSettingsStore.getState().business })}
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ PUNTO DE VENTA ══ */}
        {activeTab === "pos" && (
          <div className="config-section animate-in">
            <div className="card">
              <div className="config-card-header">
                <div>
                  <div className="card__title">Punto de Venta</div>
                  <div className="card__subtitle">Comportamiento del POS y preferencias de caja</div>
                </div>
                {savedTab === "pos" && (
                  <span className="config-saved-badge">
                    <Check size={12} /> Guardado
                  </span>
                )}
              </div>

              {/* Default payment method */}
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label">Método de pago por defecto</label>
                <div className="config-payment-grid">
                  {PAYMENT_METHODS.map((method) => {
                    const active = posForm.defaultPaymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        className={`config-payment-opt${active ? " config-payment-opt--active" : ""}`}
                        style={active ? ({ "--pay-color": method.color } as React.CSSProperties) : undefined}
                        onClick={() =>
                          setPosForm((f) => ({
                            ...f,
                            defaultPaymentMethod: method.id as PosSettings["defaultPaymentMethod"],
                          }))
                        }
                      >
                        <span
                          className="config-payment-dot"
                          style={{ background: method.color }}
                        />
                        {method.label}
                        {active && <Check size={11} style={{ marginLeft: "auto" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock alert threshold */}
              <div className="config-setting-row">
                <div>
                  <div className="config-setting-label">Umbral de stock bajo</div>
                  <div className="config-setting-hint">
                    Alerta cuando el stock cae por debajo de este valor
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: 76, textAlign: "center", fontFamily: "var(--font-mono)" }}
                    min={0}
                    max={9999}
                    value={posForm.stockAlertThreshold}
                    onChange={(e) =>
                      setPosForm((f) => ({
                        ...f,
                        stockAlertThreshold: Math.max(0, Number(e.target.value)),
                      }))
                    }
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>uds.</span>
                </div>
              </div>

              {/* Confirm on checkout */}
              <div className="config-setting-row" style={{ borderBottom: "none" }}>
                <div>
                  <div className="config-setting-label">Confirmar antes de cobrar</div>
                  <div className="config-setting-hint">
                    Muestra pantalla de confirmación antes de procesar el pago
                  </div>
                </div>
                <button
                  className={`config-toggle${posForm.requireConfirmOnCheckout ? " config-toggle--on" : ""}`}
                  onClick={() =>
                    setPosForm((f) => ({
                      ...f,
                      requireConfirmOnCheckout: !f.requireConfirmOnCheckout,
                    }))
                  }
                  aria-pressed={posForm.requireConfirmOnCheckout}
                  aria-label="Confirmar antes de cobrar"
                />
              </div>

              <div className="config-card-footer">
                <button className="btn btn--primary" onClick={savePos}>
                  <Save size={13} /> Guardar cambios
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => setPosForm({ ...useSettingsStore.getState().pos })}
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ APARIENCIA ══ */}
        {activeTab === "apariencia" && (
          <div className="config-section animate-in">
            <div className="card">
              <div className="card__title" style={{ marginBottom: 20 }}>Apariencia y Región</div>

              <div className="config-setting-row">
                <div>
                  <div className="config-setting-label">Tema de color</div>
                  <div className="config-setting-hint">
                    {theme === "dark" ? "Modo oscuro activo" : "Modo claro activo"}
                  </div>
                </div>
                <button className="config-theme-btn" onClick={toggleTheme}>
                  <span className="config-theme-btn__icon">
                    {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                  </span>
                  <span>{theme === "dark" ? "Oscuro" : "Claro"}</span>
                  <span className={`config-theme-btn__track${theme === "light" ? " config-theme-btn__track--on" : ""}`}>
                    <span className="config-theme-btn__thumb" />
                  </span>
                </button>
              </div>

              <div className="config-setting-row">
                <div>
                  <div className="config-setting-label">Zona horaria</div>
                  <div className="config-setting-hint">Fijada al sistema — no configurable</div>
                </div>
                <span className="config-readonly-tag">
                  <Globe size={11} /> America/Argentina/Buenos_Aires
                </span>
              </div>

              <div className="config-setting-row">
                <div>
                  <div className="config-setting-label">Moneda</div>
                  <div className="config-setting-hint">Peso argentino (ARS)</div>
                </div>
                <span className="config-readonly-tag">$ ARS</span>
              </div>

              <div className="config-setting-row" style={{ borderBottom: "none" }}>
                <div>
                  <div className="config-setting-label">Idioma</div>
                  <div className="config-setting-hint">Español (Argentina)</div>
                </div>
                <span className="config-readonly-tag">🇦🇷 es-AR</span>
              </div>
            </div>
          </div>
        )}

        {/* ══ DATOS ══ */}
        {activeTab === "datos" && (
          <div className="config-section animate-in">
            {/* Export / Import */}
            <div className="card">
              <div className="card__title" style={{ marginBottom: 4 }}>Exportar e Importar</div>
              <div className="card__subtitle" style={{ marginBottom: 20 }}>
                Respalda o restaura productos, clientes, personal, costos y configuración en un solo archivo JSON.
              </div>

              <div className="config-data-grid">
                {/* Export */}
                <div className="config-data-card">
                  <div className="config-data-card__top">
                    <div className="config-data-icon config-data-icon--blue">
                      <Download size={18} />
                    </div>
                    <div>
                      <div className="config-setting-label">Exportar datos</div>
                      <div className="config-setting-hint">
                        Descarga un backup completo del sistema
                      </div>
                    </div>
                  </div>
                  <button className="btn btn--ghost btn--sm" style={{ marginTop: 14 }} onClick={exportData}>
                    <Download size={13} /> Descargar backup
                  </button>
                </div>

                {/* Import */}
                <div className="config-data-card">
                  <div className="config-data-card__top">
                    <div className="config-data-icon config-data-icon--green">
                      <Upload size={18} />
                    </div>
                    <div>
                      <div className="config-setting-label">Importar datos</div>
                      <div className="config-setting-hint">
                        {importStatus === "idle" && "Restaura desde un archivo de backup"}
                        {importStatus === "ok" && (
                          <span style={{ color: "var(--success)" }}>✓ Importado — recargando...</span>
                        )}
                        {importStatus === "error" && (
                          <span style={{ color: "var(--danger)" }}>Archivo inválido o corrupto</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={handleImportFile}
                  />
                  <button
                    className="btn btn--ghost btn--sm"
                    style={{ marginTop: 14 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={13} /> Seleccionar archivo
                  </button>
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div className="card config-danger-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <AlertTriangle size={15} style={{ color: "var(--danger)" }} />
                <div className="card__title" style={{ color: "var(--danger)" }}>
                  Zona de Peligro
                </div>
              </div>
              <div className="card__subtitle" style={{ marginBottom: 20 }}>
                Estas acciones son irreversibles. Los datos eliminados no pueden recuperarse
                salvo desde un backup.
              </div>

              {(STORE_KEYS.filter(
                (k) => k !== "carnespro-theme" && k !== "carnespro-settings"
              ) as StoreKey[]).map((key) => (
                <div key={key} className="config-setting-row">
                  <div>
                    <div className="config-setting-label">{STORE_LABELS[key]}</div>
                    <div className="config-setting-hint">
                      Elimina y restaura los datos de {STORE_LABELS[key].toLowerCase()} al
                      estado inicial
                    </div>
                  </div>
                  <button
                    className="btn btn--ghost btn--sm config-danger-btn"
                    onClick={() => setResetTarget(key)}
                  >
                    <Trash2 size={12} /> Resetear
                  </button>
                </div>
              ))}

              <div className="config-danger-all-row">
                <button className="btn btn--danger" onClick={() => setResetTarget("all")}>
                  <Trash2 size={13} /> Resetear todo el sistema
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ ACERCA DE ══ */}
        {activeTab === "acerca" && (
          <div className="config-section animate-in">
            <div className="card">
              <div className="config-about-header">
                <div className="config-about-emoji">🥩</div>
                <div>
                  <div className="config-about-name">CarnesPro</div>
                  <div className="config-about-version">v1.0.0</div>
                </div>
              </div>
              <div
                className="card__subtitle"
                style={{ marginBottom: 24, maxWidth: 520, lineHeight: 1.65 }}
              >
                Sistema de gestión integral para carnicerías. Punto de venta, control de
                stock, clientes, personal, costos y reportes en un solo lugar — sin servidor,
                sin internet, sin dependencias externas.
              </div>

              <div className="config-about-table">
                {TECH_STACK.map(({ label, value }) => (
                  <div key={label} className="config-about-row">
                    <span className="config-about-row__label">{label}</span>
                    <span className="config-about-row__value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ Reset confirmation modal ══ */}
      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <AlertTriangle size={18} style={{ color: "var(--danger)" }} />
                <div className="card__title">
                  Resetear {resetTarget === "all" ? "todo el sistema" : STORE_LABELS[resetTarget as StoreKey]}
                </div>
              </div>
              <button className="btn btn--icon btn--ghost" onClick={() => setResetTarget(null)}>
                <X size={15} />
              </button>
            </div>

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                marginBottom: 24,
                lineHeight: 1.65,
              }}
            >
              {resetTarget === "all"
                ? "Se eliminarán TODOS los datos del sistema: productos, clientes, personal y costos. Esta acción no puede deshacerse."
                : `Se eliminarán todos los datos de ${resetTargetLabel} y se restaurarán los valores iniciales. Esta acción no puede deshacerse.`}
            </p>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn--ghost" onClick={() => setResetTarget(null)}>
                Cancelar
              </button>
              <button className="btn btn--danger" onClick={confirmReset}>
                <Trash2 size={13} /> Confirmar reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
