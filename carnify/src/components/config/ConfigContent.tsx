"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Store, ShoppingCart, Palette, Info,
  Save, Check,
  Building2, Phone, Mail, MapPin, Hash,
  Sun, Moon, Globe,
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
import { getSettings, updateSettings } from "@/actions/settings";

type TabId = "negocio" | "pos" | "apariencia" | "acerca";

const TABS: { id: TabId; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "negocio",    label: "Negocio",        Icon: Store },
  { id: "pos",        label: "Punto de Venta", Icon: ShoppingCart },
  { id: "apariencia", label: "Apariencia",     Icon: Palette },
  { id: "acerca",     label: "Acerca de",      Icon: Info },
];

const TECH_STACK = [
  { label: "Framework",      value: "Next.js 16" },
  { label: "UI",             value: "React 19" },
  { label: "Estado",         value: "Zustand 5" },
  { label: "Gráficos",       value: "Recharts 3" },
  { label: "PDF",            value: "jsPDF 4" },
  { label: "Iconos",         value: "Lucide React" },
  { label: "Tipografía",     value: "Outfit · Inter · JetBrains Mono" },
  { label: "Almacenamiento", value: "PostgreSQL via Prisma" },
];

export default function ConfigContent() {
  const { business, pos, hydrate, updateBusiness, updatePos } = useSettingsStore();
  const { theme, toggleTheme } = useThemeStore();

  const [activeTab, setActiveTab] = useState<TabId>("negocio");
  const [savedTab, setSavedTab]   = useState<TabId | null>(null);

  const [bizForm, setBizForm] = useState<BusinessSettings>({ ...DEFAULT_BUSINESS });
  const [posForm, setPosForm] = useState<PosSettings>({ ...DEFAULT_POS });

  const loadSettings = useCallback(async () => {
    const s = await getSettings();
    const biz: BusinessSettings = {
      nombre:    s.nombre    ?? DEFAULT_BUSINESS.nombre,
      iniciales: s.iniciales ?? DEFAULT_BUSINESS.iniciales,
      direccion: s.direccion ?? DEFAULT_BUSINESS.direccion,
      telefono:  s.telefono  ?? DEFAULT_BUSINESS.telefono,
      cuit:      s.cuit      ?? DEFAULT_BUSINESS.cuit,
      email:     s.email     ?? DEFAULT_BUSINESS.email,
    };
    const p: PosSettings = {
      defaultPaymentMethod:    (s.defaultPaymentMethod as PosSettings["defaultPaymentMethod"]) ?? DEFAULT_POS.defaultPaymentMethod,
      stockAlertThreshold:     s.stockAlertThreshold    ?? DEFAULT_POS.stockAlertThreshold,
      requireConfirmOnCheckout: s.requireConfirmOnCheckout ?? DEFAULT_POS.requireConfirmOnCheckout,
    };
    hydrate(biz, p);
    setBizForm(biz);
    setPosForm(p);
  }, [hydrate]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function showSaved(tab: TabId) {
    setSavedTab(tab);
    setTimeout(() => setSavedTab(null), 2500);
  }

  async function saveBusiness() {
    const cleaned: BusinessSettings = {
      ...bizForm,
      iniciales: (bizForm.iniciales.trim() || "CP").slice(0, 3).toUpperCase(),
    };
    updateBusiness(cleaned);
    setBizForm(cleaned);
    await updateSettings(cleaned);
    showSaved("negocio");
  }

  async function savePos() {
    updatePos(posForm);
    await updateSettings(posForm);
    showSaved("pos");
  }

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
                  onClick={() => setBizForm({ ...business })}
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
                        <span className="config-payment-dot" style={{ background: method.color }} />
                        {method.label}
                        {active && <Check size={11} style={{ marginLeft: "auto" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                  onClick={() => setPosForm({ ...pos })}
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

        {/* ══ ACERCA DE ══ */}
        {activeTab === "acerca" && (
          <div className="config-section animate-in">
            <div className="card">
              <div className="config-about-header">
                <div className="config-about-emoji">🥩</div>
                <div>
                  <div className="config-about-name">Carnify</div>
                  <div className="config-about-version">v1.0.0</div>
                </div>
              </div>
              <div
                className="card__subtitle"
                style={{ marginBottom: 24, maxWidth: 520, lineHeight: 1.65 }}
              >
                Sistema de gestión integral para carnicerías. Punto de venta, control de
                stock, clientes, personal, costos y reportes en un solo lugar.
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
    </div>
  );
}
