"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users2, UserPlus, Shield, Trash2, Edit3, X,
  Eye, EyeOff, Check, AlertTriangle, MonitorPlay,
  LayoutDashboard, ShoppingCart, Package, TrendingDown,
  Users, UserCog, Landmark, FileText,
} from "lucide-react";
import {
  getOrgMembers,
  createEmployee,
  updateEmployeePermissions,
  deleteEmployee,
} from "@/actions/employees";
import { AVAILABLE_SECTIONS, type SectionKey } from "@/lib/sections";
import { useImpersonationStore } from "@/stores/useImpersonationStore";

type Member = Awaited<ReturnType<typeof getOrgMembers>>[number];
type ModalType = "none" | "create" | "editPerms" | "deleteConfirm";

const ROLE_LABELS: Record<string, string> = {
  owner:   "Propietario",
  admin:   "Administrador",
  cashier: "Empleado",
  viewer:  "Solo lectura",
};

const ROLE_COLORS: Record<string, string> = {
  owner:   "var(--primary)",
  admin:   "#8B5CF6",
  cashier: "#3B82F6",
  viewer:  "#71717A",
};

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  dni: "",
  phone: "",
  address: "",
  position: "",
  salary: "",
  schedule: "",
  status: "Activo",
  notes: "",
  sections: [] as SectionKey[]
};

const SECTION_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  dashboard: LayoutDashboard,
  pos:       ShoppingCart,
  productos: Package,
  costos:    TrendingDown,
  clientes:  Users,
  personal:  UserCog,
  caja:      Landmark,
  reportes:  FileText,
};

export default function EmpleadosContent() {
  const router = useRouter();
  const { startViewAs } = useImpersonationStore();

  const [members, setMembers]         = useState<Member[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState<ModalType>("none");
  const [selected, setSelected]       = useState<Member | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [showPass, setShowPass]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await getOrgMembers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setModal("create");
  }

  function openEditPerms(m: Member) {
    setSelected(m);
    setForm({ ...EMPTY_FORM, sections: m.sections === "all" ? [] : [...m.sections] });
    setError(null);
    setModal("editPerms");
  }

  function openDelete(m: Member) {
    setSelected(m);
    setError(null);
    setModal("deleteConfirm");
  }

  function closeModal() {
    setModal("none");
    setSelected(null);
    setError(null);
  }

  function toggleSection(key: SectionKey) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.includes(key)
        ? prev.sections.filter((s) => s !== key)
        : [...prev.sections, key],
    }));
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Completá todos los campos");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createEmployee({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        sections: form.sections,
        dni: form.dni,
        phone: form.phone,
        address: form.address,
        position: form.position,
        salary: form.salary ? parseFloat(form.salary) : undefined,
        schedule: form.schedule,
        status: form.status,
        notes: form.notes,
      });
      await load();
      closeModal();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear empleado");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditPerms() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await updateEmployeePermissions(selected.id, form.sections);
      await load();
      closeModal();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar permisos");
    } finally {
      setSaving(false);
    }
  }

  function handleViewAs(m: Member) {
    if (m.sections === "all") return;
    startViewAs(m.name, m.sections);
    router.push("/");
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await deleteEmployee(selected.id);
      await load();
      closeModal();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar empleado");
    } finally {
      setSaving(false);
    }
  }

  const employees = members.filter((m) => m.role !== "owner");
  const owners    = members.filter((m) => m.role === "owner");

  return (
    <div style={{ padding: "32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "var(--primary-soft)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <Users2 size={22} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Gestión de Empleados
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              {members.length} {members.length === 1 ? "usuario" : "usuarios"} en esta cuenta
            </p>
          </div>
        </div>
        <button className="btn--primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          <UserPlus size={16} />
          Nuevo empleado
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64, color: "var(--text-muted)" }}>Cargando...</div>
      ) : (
        <>
          {/* Owner row */}
          {owners.map((m) => (
            <MemberCard key={m.id} member={m} onEdit={undefined} onDelete={undefined} onViewAs={undefined} />
          ))}

          {/* Employees */}
          {employees.length === 0 ? (
            <div style={{
              border: "2px dashed var(--border)", borderRadius: 14,
              padding: "48px 32px", textAlign: "center", color: "var(--text-muted)",
              marginTop: 16,
            }}>
              <Users2 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 15, margin: "0 0 4px" }}>Todavía no hay empleados</p>
              <p style={{ fontSize: 13 }}>Creá un empleado y asignale las secciones que puede usar.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              {employees.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  onEdit={() => openEditPerms(m)}
                  onDelete={() => openDelete(m)}
                  onViewAs={() => handleViewAs(m)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modal: Create Employee ── */}
      {modal === "create" && (
        <ModalOverlay onClose={closeModal}>
          <div className="modal emp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <div className="emp-modal__heading">
                <div className="emp-modal__icon">
                  <UserPlus size={18} color="var(--primary)" />
                </div>
                <div>
                  <h2 className="modal__title">Nuevo Empleado</h2>
                  <span className="emp-modal__subtitle">Completá los datos del nuevo miembro</span>
                </div>
              </div>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>

            <div className="emp-modal__body">
              <SectionDivider label="Acceso al sistema" />
              <div className="emp-form-grid">
                <div className="emp-form-col-2">
                  <FieldLabel required>Nombre completo</FieldLabel>
                  <input className="form-input" placeholder="Ej: Juan Pérez" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel required>Email</FieldLabel>
                  <input className="form-input" type="email" placeholder="email@ejemplo.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel required>Contraseña</FieldLabel>
                  <div className="emp-pass-wrap">
                    <input
                      className="form-input"
                      type={showPass ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      style={{ paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowPass((p) => !p)} className="emp-pass-toggle">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <SectionDivider label="Datos personales" />
              <div className="emp-form-grid">
                <div>
                  <FieldLabel>DNI</FieldLabel>
                  <input className="form-input" placeholder="20-12345678-9" value={form.dni} onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Teléfono</FieldLabel>
                  <input className="form-input" placeholder="11-4567-8901" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="emp-form-col-2">
                  <FieldLabel>Dirección</FieldLabel>
                  <input className="form-input" placeholder="Av. Corrientes 1234, CABA" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
                </div>
              </div>

              <SectionDivider label="Información laboral" />
              <div className="emp-form-grid">
                <div>
                  <FieldLabel>Cargo</FieldLabel>
                  <select className="form-input" value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}>
                    <option value="">Seleccionar cargo</option>
                    <option value="carnicero">Carnicero</option>
                    <option value="administrador">Administrador</option>
                    <option value="atencion">Atención al cliente</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Sueldo ($)</FieldLabel>
                  <input className="form-input" type="number" placeholder="0" min="0" value={form.salary} onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Horario</FieldLabel>
                  <input className="form-input" placeholder="Ej: Lun-Sáb 08:00-16:00" value={form.schedule} onChange={(e) => setForm((p) => ({ ...p, schedule: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Estado</FieldLabel>
                  <select className="form-input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <SectionDivider label="Secciones habilitadas" />
              <SectionsGrid selected={form.sections} onToggle={toggleSection} />

              <div style={{ marginTop: 4 }}>
                <FieldLabel>Notas</FieldLabel>
                <textarea className="form-input" rows={3} placeholder="Observaciones..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} style={{ resize: "vertical" }} />
              </div>

              {error && <ErrorBanner message={error} />}
            </div>

            <div className="emp-modal__footer">
              <button className="btn btn--ghost" onClick={closeModal} disabled={saving}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleCreate} disabled={saving}>
                {saving ? "Creando..." : "Crear empleado"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Edit Permissions ── */}
      {modal === "editPerms" && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h2 className="modal__title">Permisos de {selected.name}</h2>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>{selected.email}</p>
              </div>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="emp-modal__body">
              <SectionsGrid selected={form.sections} onToggle={toggleSection} />
              {error && <ErrorBanner message={error} />}
            </div>
            <div className="emp-modal__footer">
              <button className="btn btn--ghost" onClick={closeModal} disabled={saving}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleEditPerms} disabled={saving}>
                {saving ? "Guardando..." : "Guardar permisos"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Delete Confirm ── */}
      {modal === "deleteConfirm" && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Eliminar empleado</h2>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="emp-modal__body">
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <AlertTriangle size={36} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
                    ¿Eliminar a {selected.name}?
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    Se le revocará el acceso al sistema. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              {error && <ErrorBanner message={error} />}
            </div>
            <div className="emp-modal__footer">
              <button className="btn btn--ghost" onClick={closeModal} disabled={saving}>Cancelar</button>
              <button className="btn btn--danger" onClick={handleDelete} disabled={saving}>
                {saving ? "Eliminando..." : <><Trash2 size={14} /> Eliminar</>}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function MemberCard({
  member,
  onEdit,
  onDelete,
  onViewAs,
}: {
  member: Member;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewAs?: () => void;
}) {
  const isOwner = member.role === "owner";
  const sections = member.sections === "all"
    ? AVAILABLE_SECTIONS.map((s) => s.label)
    : AVAILABLE_SECTIONS.filter((s) => (member.sections as string[]).includes(s.key)).map((s) => s.label);

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: isOwner ? "var(--primary-soft)" : "var(--surface)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 15,
        color: isOwner ? "var(--primary)" : "var(--text-secondary)",
        flexShrink: 0,
      }}>
        {member.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{member.name}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px",
            borderRadius: 20, border: `1px solid ${ROLE_COLORS[member.role] ?? "var(--border)"}`,
            color: ROLE_COLORS[member.role] ?? "var(--text-muted)",
          }}>
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>{member.email}</p>

        {/* Section chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {member.sections === "all" ? (
            <span style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20,
              background: "var(--success-soft)", color: "var(--success)",
              border: "1px solid var(--success-border)", display: "flex", alignItems: "center", gap: 4,
            }}>
              <Shield size={11} /> Acceso completo
            </span>
          ) : sections.length === 0 ? (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sin secciones habilitadas</span>
          ) : (
            sections.map((s) => (
              <span key={s} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20,
                background: "var(--surface)", color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}>
                {s}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      {!isOwner && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {onViewAs && member.sections !== "all" && (
            <button
              onClick={onViewAs}
              title="Ver como este empleado"
              style={{
                height: 32, padding: "0 10px", borderRadius: 8,
                border: "1px solid rgba(245,158,11,0.4)",
                background: "rgba(245,158,11,0.08)", cursor: "pointer", display: "flex",
                alignItems: "center", gap: 5, color: "#F59E0B", fontSize: 12, fontWeight: 600,
              }}
            >
              <MonitorPlay size={13} />
              Ver como
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              title="Editar permisos"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
                background: "none", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", color: "var(--text-muted)",
              }}
            >
              <Edit3 size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              title="Eliminar empleado"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid var(--danger-border)",
                background: "none", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", color: "var(--danger)",
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SectionsGrid({
  selected,
  onToggle,
}: {
  selected: SectionKey[];
  onToggle: (k: SectionKey) => void;
}) {
  return (
    <div className="sections-grid">
      {AVAILABLE_SECTIONS.map((s) => {
        const active = selected.includes(s.key);
        const Icon = SECTION_ICONS[s.key];
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onToggle(s.key)}
            className={`section-btn ${active ? "section-btn--active" : ""}`}
          >
            <div className={`section-btn__icon ${active ? "section-btn__icon--active" : ""}`}>
              {active
                ? <Check size={13} color="white" strokeWidth={2.5} />
                : Icon && <Icon size={13} />
              }
            </div>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="section-divider">
      <span className="section-divider__label">{label}</span>
      <div className="section-divider__line" />
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="field-label">
      {children}{required && <span className="field-label__req">*</span>}
    </label>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      background: "var(--danger-soft)", border: "1px solid var(--danger-border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--danger)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <AlertTriangle size={14} />
      {message}
    </div>
  );
}
