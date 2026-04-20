"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Building2, Users, Package, ShoppingCart, LogOut, XCircle, CheckCircle,
  Search, ShieldOff, ShieldCheck, Trash2, Crown, UserX, DollarSign,
  AlertTriangle, RefreshCw, UserCheck,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toggleUserBan, deleteUser, deleteOrg, toggleUserRole, revokeUserSessions } from "./actions";

interface Org {
  id: string;
  name: string;
  slug: string | null;
  createdAt: string;
  lastSessionAt: string | null;
  owner: { name: string; email: string } | null;
  memberCount: number;
  productCount: number;
  sessionCount: number;
  clientCount: number;
  staffCount: number;
  revenue: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  banned: boolean;
  role: string;
  memberCount: number;
  sessionCount: number;
  createdAt: string;
}

interface Props {
  orgs: Org[];
  users: User[];
  totalRevenue: number;
}

export default function SuperAdminView({ orgs: initialOrgs, users: initialUsers, totalRevenue }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orgs" | "users">("orgs");
  const [orgs, setOrgs] = useState(initialOrgs);
  const [users, setUsers] = useState(initialUsers);

  const activeUsers = users.filter((u) => !u.banned).length;
  const bannedUsers = users.filter((u) => u.banned).length;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: "2rem", fontFamily: "inherit" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Panel Super Admin</h1>
            <p style={{ color: "#555", margin: 0, fontSize: "0.8rem" }}>CarnesPro · Gestión global</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, color: "#888", cursor: "pointer", fontSize: "0.8rem" }}
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<Building2 size={16} />} label="Carnicerías" value={orgs.length} color="#3b82f6" />
        <StatCard icon={<Users size={16} />} label="Usuarios" value={users.length} color="#8b5cf6" />
        <StatCard icon={<CheckCircle size={16} />} label="Activos" value={activeUsers} color="#22c55e" />
        <StatCard icon={<XCircle size={16} />} label="Bloqueados" value={bannedUsers} color="#ef4444" />
        <StatCard icon={<DollarSign size={16} />} label="Revenue total" value={`$${(totalRevenue / 1000).toFixed(0)}k`} color="#f59e0b" raw />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", borderBottom: "1px solid #1a1a1a" }}>
        <TabButton active={activeTab === "orgs"} onClick={() => setActiveTab("orgs")}>
          <Building2 size={14} /> Carnicerías ({orgs.length})
        </TabButton>
        <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")}>
          <Users size={14} /> Usuarios ({users.length})
        </TabButton>
      </div>

      {activeTab === "orgs"
        ? <OrgsTable orgs={orgs} onDelete={(id) => setOrgs((prev) => prev.filter((o) => o.id !== id))} />
        : <UsersTable users={users} setUsers={setUsers} />
      }
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "0.625rem 1rem", background: "transparent", border: "none",
        borderBottom: active ? "2px solid #DC2626" : "2px solid transparent",
        color: active ? "#fff" : "#555", cursor: "pointer",
        fontSize: "0.875rem", fontWeight: active ? 600 : 400, marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ icon, label, value, color, raw }: { icon: React.ReactNode; label: string; value: number | string; color: string; raw?: boolean }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ color: "#444", fontSize: "0.7rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <div style={{ color, opacity: 0.8 }}>{icon}</div>
      </div>
      <div style={{ fontSize: "1.875rem", fontWeight: 700, lineHeight: 1, color }}>{value}</div>
    </div>
  );
}

function Chip({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#161616", border: "1px solid #242424", borderRadius: 6, padding: "2px 8px", fontSize: "0.8rem", color: "#777" }}>
      {icon} {value}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#22c55e", "#06b6d4"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: color + "22", border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#444", pointerEvents: "none" }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 6, paddingBottom: 6, background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 7, color: "#ccc", fontSize: "0.8rem", outline: "none", width: 220 }}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "3rem", textAlign: "center", color: "#444", fontSize: "0.875rem" }}>{message}</div>
  );
}

function ConfirmButton({
  label, confirmLabel, icon, confirmIcon, onConfirm, color, disabled,
}: {
  label: string; confirmLabel: string;
  icon: React.ReactNode; confirmIcon: React.ReactNode;
  onConfirm: () => void; color: string; disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={() => { onConfirm(); setConfirming(false); }}
          disabled={disabled}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", border: `1px solid ${color}`, borderRadius: 7, cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, background: color + "22", color }}
        >
          {confirmIcon} {confirmLabel}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ padding: "4px 8px", border: "1px solid #2a2a2a", borderRadius: 7, cursor: "pointer", fontSize: "0.72rem", background: "transparent", color: "#555" }}
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", border: "1px solid #2a2a2a", borderRadius: 7, cursor: "pointer", fontSize: "0.72rem", background: "transparent", color: "#666" }}
    >
      {icon} {label}
    </button>
  );
}

// ── Orgs Table ──────────────────────────────────────────────────────────────

function OrgsTable({ orgs, onDelete }: { orgs: Org[]; onDelete: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() =>
    orgs.filter((o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.owner?.email.toLowerCase().includes(search.toLowerCase())
    ), [orgs, search]);

  const handleDelete = (orgId: string) => {
    onDelete(orgId);
    startTransition(() => deleteOrg(orgId));
  };

  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>Carnicerías registradas</h2>
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar por nombre o email..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={search ? "Sin resultados." : "Ninguna carnicería registrada todavía."} />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                {["Carnicería", "Dueño", "Datos", "Revenue", "Última sesión", "Acciones"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#444", fontWeight: 500, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr key={org.id} style={{ borderBottom: "1px solid #161616" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={org.name} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{org.name}</div>
                        {org.slug && <div style={{ color: "#444", fontSize: "0.72rem" }}>/{org.slug}</div>}
                        <div style={{ color: "#333", fontSize: "0.7rem" }}>{new Date(org.createdAt).toLocaleDateString("es-AR")}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {org.owner ? (
                      <div>
                        <div style={{ color: "#ccc", fontSize: "0.875rem" }}>{org.owner.name}</div>
                        <div style={{ color: "#555", fontSize: "0.72rem" }}>{org.owner.email}</div>
                      </div>
                    ) : <span style={{ color: "#444" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <Chip icon={<Users size={11} />} value={org.memberCount} />
                        <Chip icon={<Package size={11} />} value={org.productCount} />
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <Chip icon={<ShoppingCart size={11} />} value={org.sessionCount} />
                        <Chip icon={<UserCheck size={11} />} value={org.clientCount} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: "0.875rem" }}>
                      ${org.revenue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#555", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                    {org.lastSessionAt
                      ? new Date(org.lastSessionAt).toLocaleDateString("es-AR")
                      : <span style={{ color: "#333" }}>Sin actividad</span>
                    }
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <ConfirmButton
                      label="Eliminar"
                      confirmLabel="¿Confirmar?"
                      icon={<Trash2 size={12} />}
                      confirmIcon={<AlertTriangle size={12} />}
                      color="#ef4444"
                      onConfirm={() => handleDelete(org.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Users Table ─────────────────────────────────────────────────────────────

function UsersTable({ users, setUsers }: { users: User[]; setUsers: React.Dispatch<React.SetStateAction<User[]>> }) {
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    users.filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ), [users, search]);

  const run = (userId: string, action: () => Promise<void>, optimistic: () => void) => {
    setLoadingId(userId);
    optimistic();
    startTransition(async () => {
      await action();
      setLoadingId(null);
    });
  };

  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>Usuarios registrados</h2>
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar por nombre o email..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={search ? "Sin resultados." : "Ningún usuario registrado todavía."} />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                {["Usuario", "Rol", "Orgs / Sesiones", "Estado", "Registrado", "Acciones"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#444", fontWeight: 500, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #161616", opacity: loadingId === user.id ? 0.5 : 1, transition: "opacity 0.15s" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={user.name} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{user.name}</div>
                        <div style={{ color: "#555", fontSize: "0.72rem" }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {user.role === "admin" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#92400e22", border: "1px solid #92400e", borderRadius: 20, padding: "2px 8px", fontSize: "0.72rem", color: "#fbbf24" }}>
                        <Crown size={10} /> Admin
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 20, padding: "2px 8px", fontSize: "0.72rem", color: "#666" }}>
                        Usuario
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Chip icon={<Building2 size={11} />} value={user.memberCount} />
                      <Chip icon={<RefreshCw size={11} />} value={user.sessionCount} />
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {user.banned ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#7f1d1d22", border: "1px solid #7f1d1d", borderRadius: 20, padding: "3px 10px", fontSize: "0.72rem", color: "#f87171" }}>
                        <XCircle size={11} /> Bloqueado
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#14532d22", border: "1px solid #14532d", borderRadius: 20, padding: "3px 10px", fontSize: "0.72rem", color: "#4ade80" }}>
                        <CheckCircle size={11} /> Activo
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#444", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                    {new Date(user.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {/* Ban / Unban */}
                      <button
                        onClick={() => run(user.id, () => toggleUserBan(user.id, user.banned),
                          () => setUsers((p) => p.map((u) => u.id === user.id ? { ...u, banned: !u.banned } : u))
                        )}
                        disabled={loadingId === user.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", border: `1px solid ${user.banned ? "#166534" : "#7f1d1d"}`, borderRadius: 7, cursor: "pointer", fontSize: "0.72rem", background: "transparent", color: user.banned ? "#4ade80" : "#f87171" }}
                      >
                        {user.banned ? <><ShieldCheck size={11} /> Activar</> : <><ShieldOff size={11} /> Bloquear</>}
                      </button>

                      {/* Role toggle */}
                      <button
                        onClick={() => run(user.id, () => toggleUserRole(user.id, user.role),
                          () => setUsers((p) => p.map((u) => u.id === user.id ? { ...u, role: u.role === "admin" ? "user" : "admin" } : u))
                        )}
                        disabled={loadingId === user.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", border: "1px solid #92400e", borderRadius: 7, cursor: "pointer", fontSize: "0.72rem", background: "transparent", color: "#fbbf24" }}
                      >
                        <Crown size={11} /> {user.role === "admin" ? "Quitar admin" : "Hacer admin"}
                      </button>

                      {/* Revoke sessions */}
                      <ConfirmButton
                        label="Cerrar sesiones"
                        confirmLabel="¿Confirmar?"
                        icon={<UserX size={11} />}
                        confirmIcon={<AlertTriangle size={11} />}
                        color="#f97316"
                        disabled={loadingId === user.id}
                        onConfirm={() => run(user.id, () => revokeUserSessions(user.id),
                          () => setUsers((p) => p.map((u) => u.id === user.id ? { ...u, sessionCount: 0 } : u))
                        )}
                      />

                      {/* Delete */}
                      <ConfirmButton
                        label="Eliminar"
                        confirmLabel="¿Confirmar?"
                        icon={<Trash2 size={11} />}
                        confirmIcon={<AlertTriangle size={11} />}
                        color="#ef4444"
                        disabled={loadingId === user.id}
                        onConfirm={() => {
                          setUsers((p) => p.filter((u) => u.id !== user.id));
                          startTransition(() => deleteUser(user.id));
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
