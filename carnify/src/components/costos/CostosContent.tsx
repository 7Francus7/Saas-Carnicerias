"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calculator, TrendingUp, TrendingDown, DollarSign,
  Search, Edit2, ChevronDown, X, Check, Download,
  AlertTriangle, Loader2,
} from "lucide-react";
import { PRODUCT_CATEGORIES, formatCurrency } from "@/lib/constants";
import { useProductsStore, type Product } from "@/stores/useProductsStore";
import { useCostosStore, defaultCostForProduct } from "@/stores/useCostosStore";
import { getProducts, updateProduct as dbUpdateProduct } from "@/actions/products";
import { getCostos, upsertCosto } from "@/actions/costos";

type EditField = "cost" | "price" | null;

function exportCSV(rows: ReturnType<typeof buildRows>) {
  const header = ["Producto", "Categoría", "Unidad", "Costo", "Precio Venta", "Margen $", "Margen %", "Estado"];
  const lines = rows.map((r) => [
    r.name, r.category, r.unit,
    r.cost, r.price,
    r.marginArs,
    `${r.marginPct}%`,
    r.marginPct >= 40 ? "Óptimo" : r.marginPct >= 30 ? "Aceptable" : "Bajo",
  ].join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `costos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildRows(
  products: ReturnType<typeof useProductsStore.getState>["products"],
  costs: Record<string, number>
) {
  return products.map((p) => {
    const cost = costs[p.id] ?? defaultCostForProduct(p.id, p.price);
    const marginArs = p.price - cost;
    const marginPct = p.price > 0 ? Math.round((marginArs / p.price) * 100) : 0;
    return { ...p, cost, marginArs, marginPct };
  });
}

function marginColor(pct: number) {
  if (pct >= 40) return "var(--success)";
  if (pct >= 30) return "var(--warning)";
  return "var(--danger)";
}
function marginBadge(pct: number) {
  if (pct >= 40) return "badge--success";
  if (pct >= 30) return "badge--warning";
  return "badge--danger";
}

export default function CostosContent() {
  const products = useProductsStore((s) => s.products);
  const setProducts = useProductsStore((s) => s.setProducts);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const { costs, setCost, hydrate } = useCostosStore();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [prods, dbCosts] = await Promise.all([
      products.length === 0 ? getProducts() : Promise.resolve(products),
      getCostos(),
    ]);
    if (products.length === 0) setProducts(prods as Product[]);
    const map: Record<string, number> = {};
    dbCosts.forEach((c) => { map[c.productId] = c.cost; });
    hydrate(map);
    setLoading(false);
  }, [hydrate, products, setProducts]);

  useEffect(() => { loadData(); }, [loadData]);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState("");

  const allRows = useMemo(() => buildRows(products, costs), [products, costs]);

  const filtered = useMemo(() =>
    allRows.filter((r) => {
      const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "all" || r.category.toLowerCase() === filterCat;
      return matchSearch && matchCat;
    }),
    [allRows, search, filterCat]
  );

  // Stats from all rows (not filtered)
  const avgMargin = Math.round(allRows.reduce((a, r) => a + r.marginPct, 0) / (allRows.length || 1));
  const best  = allRows.reduce((a, b) => a.marginPct > b.marginPct ? a : b, allRows[0]);
  const worst = allRows.reduce((a, b) => a.marginPct < b.marginPct ? a : b, allRows[0]);
  const lowMarginCount = allRows.filter((r) => r.marginPct < 30).length;

  // Edit helpers
  const startEdit = (id: string, field: EditField, currentVal: number) => {
    setEditingId(id);
    setEditField(field);
    setEditValue(String(currentVal));
  };

  const confirmEdit = () => {
    const val = parseInt(editValue);
    if (!isNaN(val) && val > 0 && editingId) {
      if (editField === "cost") {
        setCost(editingId, val);
        upsertCosto(editingId, val);
      } else if (editField === "price") {
        updateProduct(editingId, { price: val });
        dbUpdateProduct(editingId, { price: val });
      }
    }
    setEditingId(null);
    setEditField(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditField(null); };

  const activeCats = useMemo(
    () => PRODUCT_CATEGORIES.filter((c) => products.some((p) => p.category.toLowerCase() === c.id)),
    [products]
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, color: "var(--text-muted)" }}>
      <Loader2 size={24} className="animate-spin" /> Cargando costos...
    </div>
  );

  return (
    <div className="page-container" style={{ animation: "fadeInUp 0.4s ease-out" }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header__left">
          <span className="page-header__greeting">Gestión</span>
          <h1 className="page-header__title">
            Análisis de <span>Costos</span>
          </h1>
        </div>
        <div className="page-header__right">
          <button className="btn btn--ghost" onClick={() => exportCSV(allRows)}>
            <Download size={15} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid animate-in">
        <div className="stat-card stat-card--revenue">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--revenue"><TrendingUp size={20} /></div>
            <span className={`stat-card__trend ${avgMargin >= 35 ? "stat-card__trend--up" : "stat-card__trend--down"}`}>
              {avgMargin >= 35 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {avgMargin}%
            </span>
          </div>
          <div className="stat-card__value">{avgMargin}%</div>
          <div className="stat-card__label">Margen Promedio</div>
        </div>

        <div className="stat-card stat-card--orders">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--orders"><TrendingUp size={20} /></div>
            <span className="stat-card__trend stat-card__trend--up">{best?.marginPct ?? 0}%</span>
          </div>
          <div className="stat-card__value" style={{ fontSize: "1.2rem" }}>{best?.name ?? "—"}</div>
          <div className="stat-card__label">Mayor Margen</div>
        </div>

        <div className="stat-card stat-card--ticket">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--ticket"><TrendingDown size={20} /></div>
            <span className="stat-card__trend stat-card__trend--down">{worst?.marginPct ?? 0}%</span>
          </div>
          <div className="stat-card__value" style={{ fontSize: "1.2rem" }}>{worst?.name ?? "—"}</div>
          <div className="stat-card__label">Menor Margen</div>
        </div>

        <div className="stat-card stat-card--clients">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--clients"><AlertTriangle size={20} /></div>
            {lowMarginCount > 0 && (
              <span className="stat-card__trend stat-card__trend--down">{lowMarginCount} productos</span>
            )}
          </div>
          <div className="stat-card__value">{lowMarginCount}</div>
          <div className="stat-card__label">Margen Bajo (&lt;30%)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="costos-filters animate-in animate-in-delay-1">
        <div className="prod-search">
          <Search size={17} className="prod-search__icon" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="prod-search__input"
          />
          {search && (
            <button className="prod-search__clear" onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="select-wrapper" style={{ width: 210 }}>
          <select
            className="costos-select"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {activeCats.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>
          <ChevronDown className="select-icon" size={16} />
        </div>
      </div>

      {/* Tip */}
      <div className="costos-tip animate-in animate-in-delay-1">
        <Calculator size={13} />
        <span>Click en <Edit2 size={11} style={{ display:"inline", verticalAlign:"middle" }} /> para editar el costo o precio de venta. Los cambios se guardan automáticamente.</span>
      </div>

      {/* Table */}
      <div className="costos-table-wrap animate-in animate-in-delay-2">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px" }}>
            <div className="empty-state__icon"><Calculator size={24} /></div>
            <span className="empty-state__title">Sin resultados</span>
          </div>
        ) : (
          <table className="costos-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Costo</th>
                <th>Precio Venta</th>
                <th>Margen $</th>
                <th>Margen %</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isEditingCost  = editingId === row.id && editField === "cost";
                const isEditingPrice = editingId === row.id && editField === "price";
                const isEditing      = isEditingCost || isEditingPrice;

                return (
                  <tr key={row.id} className={isEditing ? "costos-row--editing" : ""}>

                    {/* Producto */}
                    <td>
                      <div className="product-cell">
                        <div className="product-cell__img">{row.emoji}</div>
                        <div>
                          <div className="product-cell__name">{row.name}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            PLU {row.plu}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td>
                      <span className="badge badge--neutral">{row.category}</span>
                    </td>

                    {/* Costo */}
                    <td>
                      {isEditingCost ? (
                        <div className="cost-edit">
                          <span className="cost-edit__prefix">$</span>
                          <input
                            type="number"
                            className="cost-edit__input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); }}
                          />
                          <button className="icon-btn icon-btn--success" onClick={confirmEdit}><Check size={12} /></button>
                          <button className="icon-btn icon-btn--danger"  onClick={cancelEdit}><X size={12} /></button>
                        </div>
                      ) : (
                        <button
                          className="editable-value"
                          onClick={() => startEdit(row.id, "cost", row.cost)}
                          title="Editar costo"
                        >
                          <span>{formatCurrency(row.cost)}</span>
                          <Edit2 size={11} className="editable-value__icon" />
                        </button>
                      )}
                    </td>

                    {/* Precio Venta */}
                    <td>
                      {isEditingPrice ? (
                        <div className="cost-edit">
                          <span className="cost-edit__prefix">$</span>
                          <input
                            type="number"
                            className="cost-edit__input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); }}
                          />
                          <button className="icon-btn icon-btn--success" onClick={confirmEdit}><Check size={12} /></button>
                          <button className="icon-btn icon-btn--danger"  onClick={cancelEdit}><X size={12} /></button>
                        </div>
                      ) : (
                        <button
                          className="editable-value"
                          onClick={() => startEdit(row.id, "price", row.price)}
                          title="Editar precio de venta"
                        >
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(row.price)}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: 2 }}>/{row.unit}</span>
                          <Edit2 size={11} className="editable-value__icon" />
                        </button>
                      )}
                    </td>

                    {/* Margen $ */}
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: marginColor(row.marginPct) }}>
                        {formatCurrency(row.marginArs)}
                      </span>
                    </td>

                    {/* Margen % */}
                    <td>
                      <div className="margin-cell">
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.92rem", color: marginColor(row.marginPct) }}>
                          {row.marginPct}%
                        </span>
                        <div className="margin-bar">
                          <div
                            className="margin-bar__fill"
                            style={{ width: `${Math.min(row.marginPct, 60) / 60 * 100}%`, background: marginColor(row.marginPct) }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td>
                      <span className={`badge ${marginBadge(row.marginPct)}`}>
                        {row.marginPct >= 40 ? "Óptimo" : row.marginPct >= 30 ? "Aceptable" : "Bajo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .costos-filters {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .costos-tip {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          color: var(--text-muted);
          margin-bottom: 20px;
        }

        .prod-search {
          position: relative;
          flex: 1;
          max-width: 380px;
        }
        .prod-search__icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted); pointer-events: none;
        }
        .prod-search__input {
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 10px 36px 10px 42px;
          color: var(--text-primary);
          font-family: var(--font-body); font-size: 0.88rem;
          outline: none;
          transition: border-color var(--transition-fast);
        }
        .prod-search__input:focus { border-color: var(--primary); }
        .prod-search__clear {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center;
        }

        .costos-select {
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 10px 34px 10px 12px;
          color: var(--text-primary);
          font-family: var(--font-body); font-size: 0.88rem;
          outline: none; appearance: none; cursor: pointer;
          transition: border-color var(--transition-fast);
        }
        .costos-select:focus { border-color: var(--primary); }

        .select-wrapper { position: relative; }
        .select-icon {
          position: absolute; right: 10px; top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted); pointer-events: none;
        }

        .costos-table-wrap {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .costos-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .costos-table th {
          padding: 12px 18px;
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 0.7rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .costos-table td {
          padding: 12px 18px;
          border-bottom: 1px solid var(--border-light);
          font-size: 0.86rem;
          color: var(--text-secondary);
          vertical-align: middle;
        }
        .costos-table tbody tr { transition: background var(--transition-fast); }
        .costos-table tbody tr:hover { background: var(--bg-elevated); }
        .costos-table tbody tr:last-child td { border-bottom: none; }
        .costos-row--editing td { background: rgba(220, 38, 38, 0.03); }

        .editable-value {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast);
          font-family: var(--font-mono);
          font-size: 0.88rem;
          color: inherit;
        }
        .editable-value:hover { background: var(--surface); }
        .editable-value__icon {
          color: var(--text-muted);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        .editable-value:hover .editable-value__icon { opacity: 1; }

        .cost-edit {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-secondary);
          border: 1px solid var(--primary);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
        }
        .cost-edit__prefix { color: var(--text-tertiary); font-size: 0.85rem; }
        .cost-edit__input {
          background: none; border: none; outline: none;
          color: var(--text-primary);
          font-family: var(--font-mono); font-weight: 600;
          width: 90px; font-size: 0.9rem;
        }

        .margin-cell { display: flex; flex-direction: column; gap: 4px; }
        .margin-bar {
          width: 72px; height: 4px;
          background: var(--border-light);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .margin-bar__fill { height: 100%; border-radius: var(--radius-full); transition: width 0.3s ease; }

        .icon-btn {
          width: 24px; height: 24px;
          border-radius: var(--radius-sm);
          background: var(--bg-elevated);
          border: 1px solid var(--border-light);
          color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .icon-btn:hover { background: var(--surface); color: var(--text-primary); }
        .icon-btn--danger:hover  { background: var(--danger-soft);  border-color: var(--danger-border);  color: var(--danger);  }
        .icon-btn--success:hover { background: var(--success-soft); border-color: var(--success-border); color: var(--success); }
      `}</style>
    </div>
  );
}
