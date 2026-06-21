"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ShoppingCart, Store, Package, Beef,
  Calculator, Users, Users2, Truck, UserCog, Wallet, BarChart3,
  Settings, LogOut, ChevronRight, Sun, Moon, Menu, X, RefreshCw,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useThemeStore } from "@/stores/useThemeStore";
import { signOut, useSession } from "@/lib/auth-client";
import { getMyPermissions } from "@/actions/employees";
import { getBusinessName } from "@/actions/settings";
import type { SectionKey } from "@/lib/sections";
import { useImpersonationStore } from "@/stores/useImpersonationStore";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Package,
  Beef,
  Calculator,
  Users,
  Users2,
  Truck,
  UserCog,
  Wallet,
  BarChart3,
  Settings,
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useThemeStore();
  const { data: session } = useSession();
  const { viewingAs, stopViewAs } = useImpersonationStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [permissions, setPermissions] = useState<SectionKey[] | "all">("all");
  const [businessName, setBusinessName] = useState<string | null>(null);

  useEffect(() => {
    getMyPermissions()
      .then(setPermissions)
      .catch(() => setPermissions("all"));
    getBusinessName()
      .then(setBusinessName)
      .catch(() => setBusinessName(null));
  }, [session?.session?.activeOrganizationId]);

  const activePermissions: SectionKey[] | "all" = viewingAs
    ? viewingAs.sections
    : permissions;

  const userName = session?.user?.name ?? "Usuario";
  const activeOrganizationId = session?.session?.activeOrganizationId;
  const orgName = activeOrganizationId ? (businessName || "Mi Carniceria") : "Carnify";
  const iniciales = userName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const closeMobile = () => setMobileOpen(false);

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
    setUserMenuOpen(false);
    stopViewAs();
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSwitchAccount = async () => {
    setUserMenuOpen(false);
    stopViewAs();
    await signOut();
    router.push("/login?switch=1");
    router.refresh();
  };

  return (
    <>
      <header className="mobile-header">
        <button
          className="mobile-header__menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="mobile-header__logo">
          <div className="sidebar__logo-icon" style={{ width: 28, height: 28, borderRadius: 6 }}>
            <Store size={14} color="white" />
          </div>
          <span className="mobile-header__logo-text">Carnify</span>
        </div>
        <div style={{ width: 40 }} />
      </header>

      {mobileOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={closeMobile}
          aria-hidden="true"
          style={{ display: "block" }}
        />
      )}

      <aside className={`sidebar${mobileOpen ? " sidebar--open" : ""}`}>
        {viewingAs && (
          <div
            style={{
              margin: "8px 10px 0",
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.35)",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#F59E0B",
                margin: "0 0 2px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Vista como empleado
            </p>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: "0 0 8px",
              }}
            >
              {viewingAs.name}
            </p>
            <button
              onClick={() => {
                stopViewAs();
                router.push("/empleados");
                closeMobile();
              }}
              style={{
                width: "100%",
                padding: "5px 0",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                background: "rgba(245,158,11,0.2)",
                border: "1px solid rgba(245,158,11,0.4)",
                color: "#F59E0B",
                cursor: "pointer",
              }}
            >
              Volver a mi cuenta
            </button>
          </div>
        )}

        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">
            <Store size={20} color="white" />
          </div>
          <div className="sidebar__logo-text">Carnify</div>
          <button className="sidebar__close-btn" onClick={closeMobile} aria-label="Cerrar menu">
            <X size={18} />
          </button>
        </div>

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
                    onClick={closeMobile}
                    className={`sidebar__link ${isActive ? "sidebar__link--active" : ""}`}
                  >
                    <span className={`sidebar__link-icon-wrap${isActive ? " sidebar__link-icon-wrap--active" : ""}`}>
                      {Icon && <Icon size={16} />}
                    </span>
                    <span className="sidebar__link-text">{item.label}</span>
                    <span className="sidebar__link-right">
                      {item.badge && <span className="sidebar__badge">{item.badge}</span>}
                      {isActive && <ChevronRight size={12} className="sidebar__chevron" />}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button
            className="sidebar__link sidebar__theme-toggle"
            onClick={toggleTheme}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", marginBottom: 4 }}
          >
            <span className="sidebar__link-icon-wrap">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </span>
            <span className="sidebar__link-text">{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
          </button>

          <div className="sidebar__user" style={{ position: "relative" }}>
            {userMenuOpen && (
              <>
                <div
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden="true"
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                />
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: "var(--surface, #1a1a1a)",
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    role="menuitem"
                    onClick={handleSwitchAccount}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: "left",
                    }}
                  >
                    <RefreshCw size={15} />
                    Cambiar de cuenta
                  </button>
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: "none",
                      border: "none",
                      borderTop: "1px solid var(--border, rgba(255,255,255,0.08))",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: "left",
                    }}
                  >
                    <LogOut size={15} />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              title="Cuenta"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "inherit",
              }}
            >
              <div className="sidebar__user-avatar">{iniciales}</div>
              <div className="sidebar__user-info" style={{ textAlign: "left" }}>
                <div className="sidebar__user-name">{orgName}</div>
                <div className="sidebar__user-role">{userName}</div>
              </div>
              <ChevronRight
                size={16}
                style={{
                  marginLeft: "auto",
                  color: "var(--text-muted)",
                  transform: userMenuOpen ? "rotate(-90deg)" : "rotate(90deg)",
                  transition: "transform 0.15s",
                }}
              />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
