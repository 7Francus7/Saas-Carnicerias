"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Beef, Search, Plus, Tag,
  Edit2, Trash2, X, ChevronDown, TrendingUp,
  LayoutGrid, List, Check, Loader2,
} from "lucide-react";
import { PRODUCT_CATEGORIES, formatCurrency } from "@/lib/constants";
import { useProductsStore, type Product } from "@/stores/useProductsStore";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/actions/products";

const UNITS = ["kg", "un", "lt"] as const;
const EMPTY_FORM = { plu: "", name: "", category: "", price: "", unit: "kg", emoji: "🥩" };

export default function ProductosContent() {
  const { products, setProducts, addProduct: storeAdd, updateProduct: storeUpdate, deleteProduct: storeDelete } = useProductsStore();
  const [loading, setLoading] = useState(products.length === 0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getProducts().then((data) => {
      setProducts(data as Product[]);
      setLoading(false);
    });
  }, []);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modal state
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Inline delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Derived
  const maxPrice = useMemo(() => Math.max(...products.map((p) => p.price), 1), [products]);
  const avgPrice = useMemo(
    () => Math.round(products.reduce((a, b) => a + b.price, 0) / (products.length || 1)),
    [products]
  );
  const totalCats = useMemo(() => new Set(products.map((p) => p.category)).size, [products]);

  const filtered = useMemo(() =>
    products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.plu.includes(search);
      const matchCat = activeCategory === "all" || p.category.toLowerCase() === activeCategory;
      return matchSearch && matchCat;
    }),
    [products, search, activeCategory]
  );

  const categoryCounts = useMemo(() =>
    PRODUCT_CATEGORIES.reduce<Record<string, number>>((acc, c) => {
      acc[c.id] = products.filter((p) => p.category.toLowerCase() === c.id).length;
      return acc;
    }, {}),
    [products]
  );

  // Modal helpers
  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setModal("new");
  };

  const openEdit = (p: Product) => {
    setForm({ plu: p.plu, name: p.name, category: p.category, price: String(p.price), unit: p.unit, emoji: p.emoji });
    setEditingId(p.id);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (modal === "new") {
        const created = await createProduct({
          plu: form.plu || `${Date.now()}`.slice(-5),
          name: form.name,
          category: form.category,
          price,
          unit: form.unit as "kg" | "un" | "lt",
          emoji: form.emoji,
        });
        storeAdd(created as Product);
      } else if (modal === "edit" && editingId) {
        await updateProduct(editingId, {
          plu: form.plu,
          name: form.name,
          category: form.category,
          price,
          unit: form.unit as "kg" | "un" | "lt",
          emoji: form.emoji,
        });
        storeUpdate(editingId, { plu: form.plu, name: form.name, category: form.category, price, unit: form.unit, emoji: form.emoji });
      }
      closeModal();
    } catch (err) {
      setSaveError("Error al guardar el producto. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete === id) {
      await deleteProduct(id);
      storeDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  // Grouped view for list mode
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filtered.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filtered]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, color: "var(--text-muted)" }}>
      <Loader2 size={24} className="animate-spin" /> Cargando productos...
    </div>
  );

  return (
    <div className="page-container" style={{ animation: "fadeInUp 0.4s ease-out" }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header__left">
          <span className="page-header__greeting">Gestión</span>
          <h1 className="page-header__title">
            Catálogo de <span>Productos</span>
          </h1>
        </div>
        <div className="page-header__right">
          <div className="prod-view-toggle">
            <button
              className={`prod-view-btn ${viewMode === "grid" ? "prod-view-btn--active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Vista grilla"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`prod-view-btn ${viewMode === "list" ? "prod-view-btn--active" : ""}`}
              onClick={() => setViewMode("list")}
              title="Vista lista"
            >
              <List size={15} />
            </button>
          </div>
          <button className="btn btn--primary" onClick={openNew}>
            <Plus size={16} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid animate-in">
        <div className="stat-card stat-card--clients">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--clients"><Beef size={20} /></div>
          </div>
          <div className="stat-card__value">{products.length}</div>
          <div className="stat-card__label">Total Productos</div>
        </div>
        <div className="stat-card stat-card--orders">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--orders"><Tag size={20} /></div>
          </div>
          <div className="stat-card__value">{totalCats}</div>
          <div className="stat-card__label">Categorías</div>
        </div>
        <div className="stat-card stat-card--revenue">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--revenue"><TrendingUp size={20} /></div>
          </div>
          <div className="stat-card__value">{formatCurrency(avgPrice)}</div>
          <div className="stat-card__label">Precio Promedio</div>
        </div>
        <div className="stat-card stat-card--ticket">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--ticket"><TrendingUp size={20} /></div>
          </div>
          <div className="stat-card__value">{formatCurrency(Math.max(...products.map(p => p.price), 0))}</div>
          <div className="stat-card__label">Precio Máximo</div>
        </div>
      </div>

      {/* Filters */}
      <div className="prod-filters animate-in animate-in-delay-1">
        <div className="prod-search">
          <Search size={17} className="prod-search__icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o PLU..."
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
        <div className="prod-cats">
          <button
            className={`prod-cat ${activeCategory === "all" ? "prod-cat--active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            Todos ({products.length})
          </button>
          {PRODUCT_CATEGORIES.filter((c) => categoryCounts[c.id] > 0).map((c) => (
            <button
              key={c.id}
              className={`prod-cat ${activeCategory === c.id ? "prod-cat--active" : ""}`}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.emoji} {c.label} ({categoryCounts[c.id]})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Beef size={24} /></div>
          <span className="empty-state__title">Sin resultados</span>
          <span className="empty-state__desc">No hay productos que coincidan.</span>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Grid View ── */
        <div className="prod-grid animate-in animate-in-delay-2">
          {filtered.map((p) => {
            const pct = Math.round((p.price / maxPrice) * 100);
            const isConfirming = confirmDelete === p.id;
            return (
              <div key={p.id} className="prod-card">
                <div className="prod-card__top">
                  <div className="prod-card__emoji">{p.emoji}</div>
                  <div className="prod-card__actions">
                    <button className="icon-btn" onClick={() => openEdit(p)} title="Editar">
                      <Edit2 size={13} />
                    </button>
                    <button
                      className={`icon-btn ${isConfirming ? "icon-btn--confirming" : "icon-btn--danger"}`}
                      onClick={() => handleDelete(p.id)}
                      title={isConfirming ? "Click para confirmar" : "Eliminar"}
                    >
                      {isConfirming ? <Check size={13} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
                <div className="prod-card__body">
                  <span className="prod-card__name">{p.name}</span>
                  <span className="prod-card__cat">{p.category}</span>
                </div>
                <div className="prod-card__footer">
                  <span className="prod-card__price">
                    {formatCurrency(p.price)}
                    <span className="prod-card__unit">/{p.unit}</span>
                  </span>
                  <div className="prod-card__plu-tag">PLU {p.plu}</div>
                  <div className="prod-card__bar">
                    <div className="prod-card__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List View (grouped by category) ── */
        <div className="prod-list animate-in animate-in-delay-2">
          {Object.entries(groupedByCategory).map(([cat, items]) => {
            const catInfo = PRODUCT_CATEGORIES.find((c) => c.label === cat);
            return (
              <div key={cat} className="prod-list__group">
                <div className="prod-list__group-header">
                  <span>{catInfo?.emoji ?? "📦"} {cat}</span>
                  <span className="prod-list__group-count">{items.length} productos</span>
                </div>
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>PLU</th>
                        <th>Producto</th>
                        <th>Unidad</th>
                        <th>Precio</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p) => {
                        const isConfirming = confirmDelete === p.id;
                        return (
                          <tr key={p.id}>
                            <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                              {p.plu}
                            </td>
                            <td>
                              <div className="product-cell">
                                <div className="product-cell__img">{p.emoji}</div>
                                <div className="product-cell__name">{p.name}</div>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge--neutral">{p.unit}</span>
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary)" }}>
                              {formatCurrency(p.price)}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button className="icon-btn" onClick={() => openEdit(p)}>
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  className={`icon-btn ${isConfirming ? "icon-btn--confirming" : "icon-btn--danger"}`}
                                  onClick={() => handleDelete(p.id)}
                                >
                                  {isConfirming ? <Check size={13} /> : <Trash2 size={13} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Nuevo / Editar ── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">
                {modal === "new" ? "Nuevo Producto" : "Editar Producto"}
              </h3>
              <button className="modal__close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal__content">
              {/* Emoji + Nombre */}
              <div className="prod-form-name-row">
                <div className="form-group" style={{ width: 72 }}>
                  <label className="form-label">Ícono</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ textAlign: "center", fontSize: "1.4rem", padding: "8px" }}
                    maxLength={4}
                    value={form.emoji}
                    onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Nombre del producto *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Vacío"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <div className="select-wrapper">
                    <select
                      className="form-input"
                      required
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      <option value="">Seleccionar...</option>
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.label}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="select-icon" size={16} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Unidad *</label>
                  <div className="select-wrapper">
                    <select
                      className="form-input"
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <ChevronDown className="select-icon" size={16} />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Precio de venta *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    min={0}
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">PLU Balanza</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="00001"
                    maxLength={5}
                    value={form.plu}
                    onChange={(e) => setForm({ ...form, plu: e.target.value.replace(/\D/g, "") })}
                  />
                </div>
              </div>

              {saveError && (
                <div style={{ color: "var(--danger)", fontSize: "0.85rem", padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8, marginBottom: 8 }}>
                  {saveError}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : (modal === "new" ? "Crear Producto" : "Guardar Cambios")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .prod-view-toggle {
          display: flex;
          background: var(--bg-elevated);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 3px;
          gap: 2px;
        }
        .prod-view-btn {
          width: 30px; height: 30px;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all var(--transition-fast);
        }
        .prod-view-btn--active {
          background: var(--surface);
          color: var(--text-primary);
        }

        .prod-filters {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 24px;
        }
        .prod-search {
          position: relative;
          max-width: 440px;
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
          font-family: var(--font-body);
          font-size: 0.88rem;
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
        .prod-search__clear:hover { color: var(--text-primary); }

        .prod-cats {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .prod-cat {
          padding: 6px 14px;
          border-radius: var(--radius-full);
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
          font-size: 0.8rem; font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .prod-cat:hover { background: var(--bg-elevated); color: var(--text-primary); }
        .prod-cat--active { background: var(--primary); border-color: var(--primary); color: white; }

        .prod-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
          gap: 14px;
        }
        .prod-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 18px;
          display: flex; flex-direction: column; gap: 12px;
          transition: all var(--transition-spring);
        }
        .prod-card:hover {
          border-color: var(--border);
          background: var(--bg-card-hover);
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
        }
        .prod-card__top { display: flex; justify-content: space-between; align-items: flex-start; }
        .prod-card__emoji { font-size: 2.2rem; line-height: 1; }
        .prod-card__actions { display: flex; gap: 6px; opacity: 0; transition: opacity var(--transition-fast); }
        .prod-card:hover .prod-card__actions { opacity: 1; }
        .prod-card__body { display: flex; flex-direction: column; gap: 2px; }
        .prod-card__name { font-family: var(--font-heading); font-weight: 700; font-size: 0.92rem; color: var(--text-primary); }
        .prod-card__cat { font-size: 0.73rem; color: var(--text-tertiary); font-weight: 500; }
        .prod-card__footer { display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 1px solid var(--border-light); }
        .prod-card__price { font-family: var(--font-mono); font-weight: 700; font-size: 0.98rem; color: var(--primary); }
        .prod-card__unit { font-size: 0.7rem; color: var(--text-muted); font-weight: 500; margin-left: 2px; }
        .prod-card__plu-tag { font-size: 0.65rem; font-family: var(--font-mono); color: var(--text-muted); }
        .prod-card__bar { height: 3px; background: var(--border-light); border-radius: var(--radius-full); overflow: hidden; }
        .prod-card__bar-fill { height: 100%; background: var(--primary); border-radius: var(--radius-full); transition: width 0.4s ease; }

        .icon-btn {
          width: 28px; height: 28px;
          border-radius: var(--radius-sm);
          background: var(--bg-elevated);
          border: 1px solid var(--border-light);
          color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .icon-btn:hover { background: var(--surface); color: var(--text-primary); }
        .icon-btn--danger:hover { background: var(--danger-soft); border-color: var(--danger-border); color: var(--danger); }
        .icon-btn--confirming { background: var(--danger-soft); border-color: var(--danger-border); color: var(--danger); }

        .prod-list { display: flex; flex-direction: column; gap: 24px; }
        .prod-list__group-header {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 0.82rem; font-weight: 700;
          color: var(--text-tertiary);
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 0 2px 10px;
          border-bottom: 1px solid var(--border-light);
          margin-bottom: 8px;
        }
        .prod-list__group-count {
          font-weight: 500; text-transform: none; letter-spacing: 0;
          color: var(--text-muted); font-size: 0.78rem;
        }

        .prod-form-name-row { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 0; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { margin-bottom: 18px; }
        .form-label { display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 7px; letter-spacing: 0.01em; }
        .form-input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          color: var(--text-primary);
          font-family: var(--font-body); font-size: 0.88rem;
          outline: none;
          transition: border-color var(--transition-fast);
          appearance: none;
        }
        .form-input:focus { border-color: var(--primary); }
        .select-wrapper { position: relative; }
        .select-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; padding-top: 8px; }
      `}</style>
    </div>
  );
}
