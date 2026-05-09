"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package, Search, Plus, ArrowDownLeft,
  ArrowUpRight, AlertTriangle, History, X,
  Truck, Calendar, ChevronDown, Loader2,
} from "lucide-react";
import { formatNumber } from "@/lib/constants";
import { getStockMovements, addStockMovement, getInventory } from "@/actions/stock";
import { getProducts } from "@/actions/products";
import { getInventoryRuntimeSettings } from "@/actions/settings";
import type { Product } from "@/stores/useProductsStore";

interface Movement {
  id: string;
  date: Date | string;
  type: string;
  productName: string;
  quantity: number;
  unit: string;
  supplier?: string | null;
  note?: string | null;
  product?: { id: string; name: string; emoji: string } | null;
}

interface InventoryItemRow {
  productId: string;
  productName: string;
  emoji: string;
  quantity: number;
  unit: string;
}

type InventoryResponse = {
  product: { id: string; name: string; emoji: string };
  quantity: number;
  unit: string;
}[];

export default function InventoryContent() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [inventory, setInventory] = useState<InventoryItemRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [stockAlertThreshold, setStockAlertThreshold] = useState(10);
  const [search, setSearch] = useState("");
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [movementType, setMovementType] = useState<"entry" | "exit">("entry");
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");

  const [newEntry, setNewEntry] = useState({
    productId: "",
    productName: "",
    unit: "kg",
    quantity: "",
    supplier: "",
    batch: "",
    origin: "",
    note: "",
  });

  useEffect(() => {
    Promise.all([getStockMovements(), getInventory(), getProducts(), getInventoryRuntimeSettings()]).then(
      ([mvs, inv, prods, settings]) => {
        setMovements(mvs as Movement[]);
        setInventory(
          (inv as InventoryResponse).map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            emoji: item.product.emoji,
            quantity: item.quantity,
            unit: item.unit,
          }))
        );
        setProducts(prods as Product[]);
        setStockAlertThreshold(settings?.stockAlertThreshold ?? 10);
        setLoading(false);
      }
    );
  }, []);

  const filteredInventory = useMemo(
    () => inventory.filter((item) => item.productName.toLowerCase().includes(search.toLowerCase())),
    [inventory, search]
  );

  const currentMonthIn = useMemo(() => {
    const now = new Date();
    return movements
      .filter((movement) => movement.type === "entry" && new Date(movement.date).getMonth() === now.getMonth() && new Date(movement.date).getFullYear() === now.getFullYear())
      .reduce((acc, movement) => acc + movement.quantity, 0);
  }, [movements]);

  const currentMonthOut = useMemo(() => {
    const now = new Date();
    return movements
      .filter((movement) => movement.type === "exit" && new Date(movement.date).getMonth() === now.getMonth() && new Date(movement.date).getFullYear() === now.getFullYear())
      .reduce((acc, movement) => acc + movement.quantity, 0);
  }, [movements]);

  const lowStockCount = useMemo(
    () => inventory.filter((item) => item.quantity > 0 && item.quantity <= stockAlertThreshold).length,
    [inventory, stockAlertThreshold]
  );

  async function refreshInventory() {
    const refreshed = await getInventory();
    setInventory(
      (refreshed as InventoryResponse).map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        emoji: item.product.emoji,
        quantity: item.quantity,
        unit: item.unit,
      }))
    );
  }

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(newEntry.quantity);
    if (!newEntry.productName || Number.isNaN(qty) || qty <= 0) return;
    setSaving(true);
    setEntryError(null);
    try {
      const created = await addStockMovement({
        type: movementType,
        productId: newEntry.productId || undefined,
        productName: newEntry.productName,
        quantity: qty,
        unit: newEntry.unit,
        supplier: newEntry.supplier || undefined,
        batch: newEntry.batch || undefined,
        origin: newEntry.origin || undefined,
        note: newEntry.note || undefined,
      });
      setMovements((prev) => [created as Movement, ...prev]);
      await refreshInventory();
      setShowEntryModal(false);
      setMovementType("entry");
      setNewEntry({ productId: "", productName: "", unit: "kg", quantity: "", supplier: "", batch: "", origin: "", note: "" });
    } catch (error) {
      setEntryError(
        error instanceof Error
          ? error.message
          : `Error al registrar la ${movementType === "entry" ? "entrada" : "salida"}. Intenta de nuevo.`
      );
    } finally {
      setSaving(false);
    }
  };

  const openMovementModal = (type: "entry" | "exit") => {
    setMovementType(type);
    setEntryError(null);
    setShowEntryModal(true);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, color: "var(--text-muted)" }}>
        <Loader2 size={24} className="animate-spin" /> Cargando inventario...
      </div>
    );
  }

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <div className="inventory-title">
          <h1>Gestion de Inventario</h1>
          <p>Control de stock, ingresos y salidas de mercaderia</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn--secondary" onClick={() => openMovementModal("exit")}>
            <ArrowUpRight size={18} />
            Registrar Salida
          </button>
          <button className="btn btn--primary" onClick={() => openMovementModal("entry")}>
            <Plus size={18} />
            Registrar Entrada
          </button>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue"><Package size={20} /></div>
          <div className="stat-card__content">
            <span className="stat-card__label">Total Productos</span>
            <span className="stat-card__value">{products.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--orange"><AlertTriangle size={20} /></div>
          <div className="stat-card__content">
            <span className="stat-card__label">Stock Bajo</span>
            <span className="stat-card__value">{lowStockCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green"><ArrowDownLeft size={20} /></div>
          <div className="stat-card__content">
            <span className="stat-card__label">Ingresos del Mes</span>
            <span className="stat-card__value">{formatNumber(Math.round(currentMonthIn * 10) / 10)} kg/un</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}><ArrowUpRight size={20} /></div>
          <div className="stat-card__content">
            <span className="stat-card__label">Salidas del Mes</span>
            <span className="stat-card__value">{formatNumber(Math.round(currentMonthOut * 10) / 10)} kg/un</span>
          </div>
        </div>
      </div>

      <div className="inventory-tabs">
        <button className={`inventory-tab ${activeTab === "stock" ? "inventory-tab--active" : ""}`} onClick={() => setActiveTab("stock")}>
          <Package size={16} /> Stock Actual
        </button>
        <button className={`inventory-tab ${activeTab === "history" ? "inventory-tab--active" : ""}`} onClick={() => setActiveTab("history")}>
          <History size={16} /> Historial de Movimientos
        </button>
      </div>

      {activeTab === "stock" ? (
        <div className="inventory-view">
          <div className="inventory-filters">
            <div className="inventory-search">
              <Search size={18} className="inventory-search__icon" />
              <input
                type="text"
                placeholder="Buscar por producto..."
                className="inventory-search__input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {filteredInventory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
              <Package size={40} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
              <p>Sin stock registrado todavia.</p>
              <p style={{ fontSize: "0.85rem", marginTop: 8 }}>Registra una entrada para empezar a trackear el stock.</p>
            </div>
          ) : (
            <div className="inventory-table-container">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock Actual</th>
                    <th>Unidad</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        <div className="table-product">
                          <div className="table-product__emoji">{item.emoji}</div>
                          <div className="table-product__info">
                            <span className="table-product__name">{item.productName}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: item.quantity <= 0 ? "var(--danger)" : item.quantity <= stockAlertThreshold ? "#f59e0b" : "var(--success)" }}>
                        {formatNumber(item.quantity)} {item.unit}
                      </td>
                      <td>{item.unit}</td>
                      <td>
                        <span className={`status-badge status-badge--${item.quantity <= 0 ? "danger" : item.quantity <= stockAlertThreshold ? "warning" : "success"}`}>
                          {item.quantity <= 0 ? "Sin Stock" : item.quantity <= stockAlertThreshold ? "Bajo" : "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="inventory-view">
          {movements.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
              <History size={40} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
              <p>Sin movimientos registrados.</p>
            </div>
          ) : (
            <div className="movement-list">
              {movements.map((movement) => (
                <div key={movement.id} className="movement-card">
                  <div className={`movement-icon movement-icon--${movement.type}`}>
                    {movement.type === "entry" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div className="movement-details">
                    <div className="movement-row">
                      <span className="movement-product">
                        {movement.product?.emoji ?? "📦"} {movement.productName}
                      </span>
                      <span className={`movement-qty movement-qty--${movement.type}`}>
                        {movement.type === "entry" ? "+" : "-"}{movement.quantity} {movement.unit}
                      </span>
                    </div>
                    <div className="movement-row">
                      <span className="movement-meta">
                        <Calendar size={12} /> {new Date(movement.date).toLocaleString("es-AR")}
                      </span>
                      {movement.supplier && (
                        <span className="movement-meta">
                          <Truck size={12} /> {movement.supplier}
                        </span>
                      )}
                      {(movement as any).batch && (
                        <span className="movement-meta">Lote: {(movement as any).batch}</span>
                      )}
                      {(movement as any).origin && (
                        <span className="movement-meta">Origen: {(movement as any).origin}</span>
                      )}
                    </div>
                    {movement.note && <p className="movement-note">{movement.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showEntryModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">
                {movementType === "entry" ? "Registrar Entrada de Mercaderia" : "Registrar Salida / Merma"}
              </h3>
              <button className="modal__close" onClick={() => setShowEntryModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddStock} className="modal__content">
              <div className="form-group">
                <label className="form-label">Producto</label>
                <div className="select-wrapper">
                  <select
                    className="form-input"
                    required
                    value={newEntry.productId}
                    onChange={(e) => {
                      const product = products.find((p) => p.id === e.target.value);
                      if (product) {
                        setNewEntry({ ...newEntry, productId: product.id, productName: product.name, unit: product.unit });
                      }
                    }}
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.emoji} {product.name} ({product.unit})</option>
                    ))}
                  </select>
                  <ChevronDown className="select-icon" size={18} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cantidad ({newEntry.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    required
                    value={newEntry.quantity}
                    onChange={(e) => setNewEntry({ ...newEntry, quantity: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{movementType === "entry" ? "Proveedor" : "Motivo"}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={movementType === "entry" ? "Nombre del proveedor" : "Ej: merma, vencimiento, ajuste"}
                    value={newEntry.supplier}
                    onChange={(e) => setNewEntry({ ...newEntry, supplier: e.target.value })}
                  />
                </div>
              </div>

              {movementType === "entry" && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Lote</label>
                    <input type="text" className="form-input" placeholder="Ej: L-2025-001"
                      value={newEntry.batch} onChange={(e) => setNewEntry({ ...newEntry, batch: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Origen</label>
                    <input type="text" className="form-input" placeholder="Ej: Argentina, Brasil"
                      value={newEntry.origin} onChange={(e) => setNewEntry({ ...newEntry, origin: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder={movementType === "entry" ? "Ej: ingreso de media res..." : "Ej: recorte, hueso, producto vencido..."}
                  value={newEntry.note}
                  onChange={(e) => setNewEntry({ ...newEntry, note: e.target.value })}
                />
              </div>

              {entryError && (
                <div style={{ color: "var(--danger)", fontSize: "0.85rem", padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8, marginBottom: 8 }}>
                  {entryError}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowEntryModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : movementType === "entry" ? "Confirmar Ingreso" : "Confirmar Salida"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .inventory-container { padding: 32px; animation: fadeIn 0.4s ease-out; }
        .inventory-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .inventory-title h1 { font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
        .inventory-title p { color: var(--text-tertiary); font-size: 0.95rem; }
        .inventory-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 32px; }
        .stat-card { background: var(--bg-card); border: 1px solid var(--border-light); padding: 24px; border-radius: var(--radius-lg); display: flex; align-items: center; gap: 20px; }
        .stat-card__icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-card__icon--blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .stat-card__icon--orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .stat-card__icon--green { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        .stat-card__label { display: block; font-size: 0.85rem; color: var(--text-tertiary); margin-bottom: 4px; }
        .stat-card__value { display: block; font-size: 1.5rem; font-weight: 800; color: var(--text-primary); font-family: var(--font-mono); }
        .inventory-tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border-light); margin-bottom: 24px; }
        .inventory-tab { padding: 12px 20px; border: none; background: none; color: var(--text-muted); font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 10px; cursor: pointer; position: relative; transition: all var(--transition-fast); }
        .inventory-tab:hover { color: var(--text-primary); }
        .inventory-tab--active { color: var(--primary); }
        .inventory-tab--active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--primary); }
        .inventory-filters { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; }
        .inventory-search { position: relative; flex: 1; max-width: 400px; }
        .inventory-search__icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .inventory-search__input { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 10px 10px 10px 40px; color: var(--text-primary); outline: none; }
        .inventory-table-container { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); overflow: hidden; }
        .inventory-table { width: 100%; border-collapse: collapse; text-align: left; }
        .inventory-table th { padding: 16px 24px; background: var(--bg-secondary); color: var(--text-tertiary); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .inventory-table td { padding: 16px 24px; border-bottom: 1px solid var(--border-light); color: var(--text-secondary); font-size: 0.9rem; }
        .table-product { display: flex; align-items: center; gap: 16px; }
        .table-product__emoji { width: 40px; height: 40px; background: var(--bg-secondary); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
        .table-product__name { display: block; font-weight: 700; color: var(--text-primary); }
        .movement-list { display: flex; flex-direction: column; gap: 12px; }
        .movement-card { background: var(--bg-card); border: 1px solid var(--border-light); padding: 16px; border-radius: var(--radius-md); display: flex; gap: 20px; align-items: center; }
        .movement-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .movement-icon--entry { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        .movement-icon--exit { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .movement-details { flex: 1; }
        .movement-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
        .movement-product { font-weight: 700; color: var(--text-primary); }
        .movement-qty { font-family: var(--font-mono); font-weight: 800; font-size: 1.1rem; }
        .movement-qty--entry { color: #22c55e; }
        .movement-qty--exit { color: var(--danger); }
        .movement-meta { color: var(--text-tertiary); font-size: 0.75rem; display: flex; align-items: center; gap: 5px; }
        .movement-note { margin-top: 8px; font-size: 0.85rem; color: var(--text-muted); background: var(--bg-secondary); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--border-light); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; }
        .form-input { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 12px 16px; color: var(--text-primary); font-family: var(--font-body); outline: none; transition: border-color 0.2s; appearance: none; }
        .form-input:focus { border-color: var(--primary); }
        .form-textarea { min-height: 100px; resize: vertical; }
        .select-wrapper { position: relative; }
        .select-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; padding-top: 8px; }
      `}</style>
    </div>
  );
}
