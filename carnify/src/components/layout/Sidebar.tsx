"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ShoppingCart, Store, Package, Beef,
  Calculator, Users, Users2, Truck, UserCog, Wallet, BarChart3,
  Settings, LogOut, ChevronRight, Sun, Moon,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useThemeStore } from "@/stores/useThemeStore";
import { signOut, useSession } from "@/lib/auth-client";
import { getMyPermissions } from "@/actions/employees";
import type { SectionKey } from "@/lib/sections";
import { useImpersonationStore } from "@/stores/useImpersonationStore";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard, ShoppingCart, Store, Package, Beef,
  Calculator, Users, Users2, Truck, UserCog, Wallet, BarChart3,
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useThemeStore();
  const { data: session } = useSession();

  const [permissions, setPermissions] = useState<SectionKey[] | "all">("all");
  const { viewingAs, stopViewAs } = useImpersonationStore();

  useEffect(() => {
    getMyPermissions()
      .then(setPermissions)
      .catch(() => setPermissions("all"));
  }, [session?.session?.activeOrganizationId]);

  const activePermissions: SectionKey[] | "all" = viewingAs
    ? viewingAs.sections
    : permissions;

  const userName = session?.user?.name ?? "Usuario";
  const orgName = (session as any)?.session?.activeOrganizationId ? "Mi Carnicería" : "Carnify";
  const iniciales = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const canAccess = (sectionKey: string) => {
    if (viewingAs) {
      if (sectionKey === "empleados") return false;
      return viewingAs.sections.includes(sectionKey as SectionKey);
    }
    if (activePermissions === "all") return true;
    if (sectionKey === "empleados") return false;
    return activePermissions.includes(sectionKey as SectionKey);
  };

  const filteredNav = NAV_ITEMS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(item.sectionKey)),
    }))
    .filter((section) => section.items.length > 0);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="sidebar">
      {/* Impersonation banner */}
      {viewingAs && (
        <div style={{
          margin: "8px 10px 0",
          background: "rgba(245,158,11,0.12)",
          border: "1px solid rgba(245,158,11,0.35)",
          borderRadius: 10,
          padding: "10px 12px",
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#F59E0B", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Vista como empleado
          </p>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px" }}>
            {viewingAs.name}
          </p>
          <button
            onClick={() => { stopViewAs(); router.push("/empleados"); }}
            style={{
              width: "100%", padding: "5px 0", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)",
              color: "#F59E0B", cursor: "pointer",
            }}
          >
            ← Volver a mi cuenta
          </button>
        </div>
      )}

      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <Store size={20} color="white" />
        </div>
        <div className="sidebar__logo-text">
          Carnify
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {filteredNav.map((section) => (
          <div key={section.section}>
            <div className="sidebar__section-title">{section.section}</div>
            {section.items.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar__link ${isActive ? "sidebar__link--active" : ""}`}
                >
                  <span className={`sidebar__link-icon-wrap${isActive ? " sidebar__link-icon-wrap--active" : ""}`}>
                    {Icon && <Icon size={16} />}
                  </span>
                  <span>{item.label}</span>
                  <span className="sidebar__link-right">
                    {item.badge && (
                      <span className="sidebar__badge">{item.badge}</span>
                    )}
                    {isActive && <ChevronRight size={12} className="sidebar__chevron" />}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar__footer">
        <button
          className="sidebar__link sidebar__theme-toggle"
          onClick={toggleTheme}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", marginBottom: 4 }}
        >
          <span className="sidebar__link-icon-wrap">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </span>
          <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
        </button>
        {permissions === "all" && !viewingAs && (
          <Link href="/config" className="sidebar__link" style={{ marginBottom: 4 }}>
            <span className="sidebar__link-icon-wrap">
              <Settings size={16} />
            </span>
            <span>Configuración</span>
          </Link>
        )}
        <div className="sidebar__user">
          <div className="sidebar__user-avatar">{iniciales}</div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{orgName}</div>
            <div className="sidebar__user-role">{userName}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
