"use client";

import { Search, X, UserPlus, Users, TrendingUp, ShieldAlert, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { ClientProfile } from "@/stores/useClientStore";

type FilterType = "all" | "debt" | "overdue";

interface SidebarStats {
  total: number;
  withDebt: number;
  overdue: number;
  totalDebt: number;
}

interface ClientSidebarProps {
  search: string;
  onSearchChange: (v: string) => void;
  onSearchClear: () => void;
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  stats: SidebarStats;
  filteredClients: ClientProfile[];
  selectedClientId: string | null;
  onSelectClient: (id: string) => void;
  onAddClient: () => void;
  relativeDate: (d: string) => string;
}

export default function ClientSidebar({
  search, onSearchChange, onSearchClear,
  filter, onFilterChange,
  stats, filteredClients, selectedClientId,
  onSelectClient, onAddClient, relativeDate,
}: ClientSidebarProps) {
  return (
    <div className="crm-sidebar">
      <div className="crm-sidebar__header">
        <div className="sidebar-top">
          <div className="crm-search">
            <Search size={15} className="crm-search__icon" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o tel..."
              className="crm-search__input"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {search && (
              <button className="crm-search__clear" onClick={onSearchClear}>
                <X size={13} />
              </button>
            )}
          </div>
          <button className="btn-add" onClick={onAddClient} title="Nuevo cliente">
            <UserPlus size={17} />
          </button>
        </div>

        <div className="filter-tabs">
          {(["all", "debt", "overdue"] as const).map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? "filter-tab--active" : ""}`}
              onClick={() => onFilterChange(f)}
            >
              {f === "all" ? "Todos" : f === "debt" ? "Con Deuda" : "En Mora"}
              <span className="filter-tab__count">
                {f === "all" ? stats.total : f === "debt" ? stats.withDebt : stats.overdue}
              </span>
            </button>
          ))}
        </div>

        {stats.totalDebt > 0 && (
          <div className="sidebar-total-debt">
            <span>
              <TrendingUp size={18} />
              Deuda total:
              <strong>{formatCurrency(stats.totalDebt)}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="client-list">
        {filteredClients.length === 0 ? (
          <div className="client-list-empty">
            <Users size={32} />
            <p>Sin resultados</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              className={`client-item ${selectedClientId === client.id ? "client-item--active" : ""} ${client.status === "overdue" ? "client-item--overdue" : ""}`}
              onClick={() => onSelectClient(client.id)}
            >
              <div className={`client-item__avatar ${client.status === "overdue" ? "avatar--danger" : client.status === "blocked" ? "avatar--muted" : "avatar--default"}`}>
                {client.name.charAt(0)}
              </div>
              <div className="client-item__info">
                <div className="client-item__row1">
                  <div className="client-item__name">{client.name}</div>
                  <div className="client-item__date">{relativeDate(client.lastActivity)}</div>
                </div>
                <div className="client-item__sub">
                  {client.balance > 0 ? (
                    <span className={`debt-tag ${client.status === "overdue" ? "debt-tag--overdue" : "debt-tag--debt"}`}>
                      {client.status === "overdue" && <ShieldAlert size={10} />}
                      Debe {formatCurrency(client.balance)}
                    </span>
                  ) : (
                    <span className="debt-tag debt-tag--ok">
                      <CheckCircle2 size={10} /> Al día
                    </span>
                  )}
                  {client.phone && <span className="client-item__phone">{client.phone}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
