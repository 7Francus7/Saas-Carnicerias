"use client";

import { useState } from "react";
import { Building2, Users, Package, ShoppingCart, LogOut, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toggleUserBan } from "./actions";

interface Org {
  id: string;
  name: string;
  slug: string | null;
  createdAt: string;
  owner: { name: string; email: string } | null;
  memberCount: number;
  productCount: number;
  sessionCount: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  banned: boolean;
  memberCount: number;
  createdAt: string;
}

interface Props {
  orgs: Org[];
  users: User[];
}

export default function SuperAdminView({ orgs, users }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orgs" | "users">("orgs");

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0a0a0a)", color: "var(--text-primary, #fff)", padding: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Panel Super Admin</h1>
          <p style={{ color: "#888", margin: "4px 0 0" }}>Gestión global de CarnesPro</p>
        </div>
        <button
          onClick={handleSignOut}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, color: "#ccc", cursor: "pointer", fontSize: "0.875rem" }}
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<Building2 size={20} />} label="Carnicerías" value={orgs.length} />
        <StatCard icon={<Users size={20} />} label="Usuarios" value={users.length} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "1px solid #222" }}>
        <TabButton active={activeTab === "orgs"} onClick={() => setActiveTab("orgs")}>
          Carnicerías ({orgs.length})
        </TabButton>
        <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")}>
          Usuarios ({users.length})
        </TabButton>
      </div>

      {/* Content */}
      {activeTab === "orgs" ? <OrgsTable orgs={orgs} /> : <UsersTable users={users} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.75rem 1.25rem",
        background: active ? "#DC2626" : "transparent",
        border: "none",
        borderRadius: "8px 8px 0 0",
        color: active ? "#fff" : "#888",
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

function OrgsTable({ orgs }: { orgs: Org[] }) {
  return (
    <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #222" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Carnicerías registradas</h2>
      </div>

        {orgs.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#666" }}>
            Ninguna carnicería registrada todavía.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  {["Carnicería", "Dueño", "Email", "Miembros", "Productos", "Sesiones caja", "Registrada"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#666", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>{org.name}</td>
                    <td style={{ padding: "12px 16px", color: "#ccc" }}>{org.owner?.name ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#888" }}>{org.owner?.email ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <Chip icon={<Users size={12} />} value={org.memberCount} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Chip icon={<Package size={12} />} value={org.productCount} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Chip icon={<ShoppingCart size={12} />} value={org.sessionCount} />
                    </td>
                    <td style={{ padding: "12px 16px", color: "#666" }}>
                      {new Date(org.createdAt).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#e03030", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#666", fontSize: "0.875rem" }}>{label}</div>
    </div>
  );
}

function Chip({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "2px 8px", fontSize: "0.8rem", color: "#aaa" }}>
      {icon} {value}
    </span>
  );
}

function UsersTable({ users }: { users: User[] }) {
  return (
    <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #222" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Usuarios registrados</h2>
      </div>

      {users.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#666" }}>
          Ningún usuario registrado todavía.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                {["Usuario", "Email", "Organizaciones", "Estado", "Registrado", "Acciones"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#666", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{user.name}</td>
                  <td style={{ padding: "12px 16px", color: "#888" }}>{user.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <Chip icon={<Building2 size={12} />} value={user.memberCount} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {user.banned ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#7f1d1d", border: "1px solid #991b1b", borderRadius: 6, padding: "2px 8px", fontSize: "0.75rem", color: "#fca5a5" }}>
                        <XCircle size={12} /> Bloqueado
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#14532d", border: "1px solid #166534", borderRadius: 6, padding: "2px 8px", fontSize: "0.75rem", color: "#86efac" }}>
                        <CheckCircle size={12} /> Activo
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#666" }}>
                    {new Date(user.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <form action={toggleUserBan.bind(null, user.id, user.banned)}>
                      <button
                        type="submit"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", border: "none", borderRadius: 6,
                          cursor: "pointer", fontSize: "0.75rem",
                          background: user.banned ? "#166534" : "#7f1d1d",
                          color: "#fff",
                        }}
                      >
                        {user.banned ? "Activar" : "Bloquear"}
                      </button>
                    </form>
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
