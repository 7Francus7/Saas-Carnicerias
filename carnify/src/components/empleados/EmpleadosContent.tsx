"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users2, UserPlus, Shield, Trash2, Edit3, X,
  Eye, EyeOff, Check, Mail, Lock, User, AlertTriangle, MonitorPlay,
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
      });
      await load();
      closeModal();
    } catch (e: any) {
      setError(e.message ?? "Error al crear empleado");
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
    } catch (e: any) {
      setError(e.message ?? "Error al actualizar permisos");
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
    } catch (e: any) {
      setError(e.message ?? "Error al eliminar empleado");
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
          <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "min(560px, 95vw)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tertiary)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Nuevo empleado</h2>
              <button onClick={closeModal} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Nombre completo</label>
                  <input
                    className="form-input"
                    placeholder="Juan García"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    style={{ background: "var(--bg-elevated)" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="juan@carniceria.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    style={{ background: "var(--bg-elevated)" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Contraseña</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="form-input"
                      type={showPass ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      style={{ background: "var(--bg-elevated)", paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
                    Secciones habilitadas
                  </p>
                  <SectionsGrid selected={form.sections} onToggle={toggleSection} />
                </div>

                {error && (
                  <div style={{ background: "var(--danger-soft)", border: "1px solid var(--danger-border)", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={14} />
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 8 }}>
                  <button className="btn--ghost" onClick={closeModal} disabled={saving}>Cancelar</button>
                  <button className="btn--primary" onClick={handleCreate} disabled={saving}>
                    {saving ? "Creando..." : "Crear empleado"}
                  </button>
                </div>
              </div>
              {/* Nueva UI: campos extendidos (solo visual) */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 12,
              }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>DNI</label>
                  <input className="form-input" placeholder="20-12345678-9" value={form.dni} onChange={(e)=>setForm((p)=>({...p, dni: e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Teléfono</label>
                  <input className="form-input" placeholder="11-4567-8901" value={form.phone} onChange={(e)=>setForm((p)=>({...p, phone: e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Dirección</label>
                  <input className="form-input" placeholder="Av. Corrientes 1234, CABA" value={form.address} onChange={(e)=>setForm((p)=>({...p, address: e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cargo</label>
                  <select className="form-input" value={form.position} onChange={(e)=>setForm((p)=>({...p, position: e.target.value}))}>
                    <option value="">Selecciona cargo</option>
                    <option value="carnicero">Carnicero</option>
                    <option value="administrador">Administrador</option>
                    <option value="atencion">Atención</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Sueldo</label>
                  <input className="form-input" placeholder="0" value={form.salary} onChange={(e)=>setForm((p)=>({...p, salary: e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Horario</label>
                  <input className="form-input" placeholder="Ej: Lun-Sáb 08:00-16:00" value={form.schedule} onChange={(e)=>setForm((p)=>({...p, schedule: e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Estado</label>
                  <select className="form-input" value={form.status} onChange={(e)=>setForm((p)=>({...p, status: e.target.value}))}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Notas</label>
                  <textarea className="form-input" rows={3} placeholder="Observaciones..." value={form.notes} onChange={(e)=>setForm((p)=>({...p, notes: e.target.value}))}/>
                </div>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Edit Permissions ── */}
      {modal === "editPerms" && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="modal__header">
            <div>
              <h2 className="modal__title">Permisos de {selected.name}</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>{selected.email}</p>
            </div>
            <button className="modal__close" onClick={closeModal}><X size={18} /></button>
          </div>
          <div className="modal__content">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>
                  Secciones habilitadas
                </p>
                <SectionsGrid selected={form.sections} onToggle={toggleSection} />
              </div>

              {error && <ErrorBanner message={error} />}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8 }}>
                <button className="btn--ghost btn--sm" onClick={closeModal} disabled={saving}>Cancelar</button>
                <button className="btn--primary btn--sm" onClick={handleEditPerms} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar permisos"}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal: Delete Confirm ── */}
      {modal === "deleteConfirm" && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="modal__header">
            <h2 className="modal__title">Eliminar empleado</h2>
            <button className="modal__close" onClick={closeModal}><X size={18} /></button>
          </div>
          <div className="modal__content">
            <div style={{ display: "flex", gap: 14, padding: "8px 0 16px" }}>
              <AlertTriangle size={40} color="var(--warning)" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
                  ¿Eliminar a {selected.name}?
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  Se le revocará el acceso al sistema. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            {error && <ErrorBanner message={error} />}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn--ghost btn--sm" onClick={closeModal} disabled={saving}>Cancelar</button>
              <button className="btn--danger btn--sm" onClick={handleDelete} disabled={saving}>
                {saving ? "Eliminando..." : "Eliminar"}
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {AVAILABLE_SECTIONS.map((s) => {
        const active = selected.includes(s.key);
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onToggle(s.key)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
              background: active ? "var(--primary-soft)" : "var(--bg-tertiary)",
              color: active ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: 500, fontSize: 13, textAlign: "left",
              transition: "all 150ms",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: 4,
              border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
              background: active ? "var(--primary)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {active && <Check size={11} color="white" strokeWidth={3} />}
            </div>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {children}
      </div>
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
