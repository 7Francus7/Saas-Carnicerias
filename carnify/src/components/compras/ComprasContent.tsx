"use client";

import { useEffect, useState } from "react";
import {
  Truck, Plus, Search, Building2, Calendar,
  X, Loader2, Trash2, Package,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import {
  getSuppliers, createSupplier, deleteSupplier,
  getPurchases, createPurchase, deletePurchase,
} from "@/actions/purchases";
import { getProducts } from "@/actions/products";
import type { Product } from "@/stores/useProductsStore";

interface Supplier {
  id: string; name: string; contactName: string;
  phone: string; email: string; cuit: string;
}

interface PurchaseItem {
  id: string;
  quantity: number; unit: string; unitCost: number; totalCost: number;
  product: { id: string; name: string; emoji: string };
}

interface Purchase {
  id: string; date: Date; total: number; paymentMethod: string;
  status: string; notes: string;
  supplier: { id: string; name: string };
  items: PurchaseItem[];
}

export default function ComprasContent() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", contactName: "", phone: "", email: "", address: "", cuit: "", notes: "" });

  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: "", paymentMethod: "cash", notes: "",
    items: [] as { productId: string; quantity: number; unit: string; unitCost: number }[],
  });

  const load = async () => {
    setLoading(true);
    const [s, p, pr] = await Promise.all([getSuppliers(), getPurchases(), getProducts()]);
    setSuppliers(s); setPurchases(p); setProducts(pr);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const errorMsg = (e: unknown, fallback: string) => {
    const msg = e instanceof Error ? e.message : "";
    return msg && !msg.includes("Server Components render") ? msg : fallback;
  };

  const handleCreateSupplier = async () => {
    setActionError(null);
    setSaving(true);
    try {
      await createSupplier(supplierForm);
      setShowSupplierModal(false);
      setSupplierForm({ name: "", contactName: "", phone: "", email: "", address: "", cuit: "", notes: "" });
      await load();
    } catch (e) {
      setActionError(errorMsg(e, "No se pudo guardar el proveedor. Intentá de nuevo."));
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePurchase = async () => {
    setActionError(null);
    setSaving(true);
    try {
      await createPurchase(purchaseForm);
      setShowPurchaseModal(false);
      setPurchaseForm({ supplierId: "", paymentMethod: "cash", notes: "", items: [] });
      await load();
    } catch (e) {
      setActionError(errorMsg(e, "No se pudo registrar la compra. Intentá de nuevo."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePurchase = async (id: string) => {
    setActionError(null);
    try {
      await deletePurchase(id);
      await load();
    } catch (e) {
      setActionError(errorMsg(e, "No se pudo anular la compra."));
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    setActionError(null);
    try {
      await deleteSupplier(id);
      await load();
    } catch (e) {
      setActionError(errorMsg(e, "No se pudo eliminar el proveedor."));
    }
  };

  const addItemToPurchase = () => {
    setPurchaseForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, unit: "kg", unitCost: 0 }],
    }));
  };

  type PurchaseFormItem = { productId: string; quantity: number; unit: string; unitCost: number };
  const updatePurchaseItem = <K extends keyof PurchaseFormItem>(idx: number, field: K, value: PurchaseFormItem[K]) => {
    setPurchaseForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const removePurchaseItem = (idx: number) => {
    setPurchaseForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const filtered = purchases.filter(
    (p) =>
      p.supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      p.notes.toLowerCase().includes(search.toLowerCase())
  );

  const supplierFiltered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.cuit.includes(search)
  );

  const inputCls = "w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors";
  const inputStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-light)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-body)",
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "var(--radius-md)",
              background: "var(--primary-soft)", display: "flex",
              alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(229,57,53,0.15)",
            }}>
              <Truck size={20} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h1 className="page-header__title">Compras</h1>
              <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", marginTop: 2 }}>
                Gestión de compras y proveedores
              </p>
            </div>
          </div>
        </div>
        <div className="page-header__right">
          <button
            onClick={() => { setActionError(null); setShowSupplierModal(true); }}
            className="btn btn--ghost btn--sm"
            style={{ gap: 8 }}
          >
            <Building2 size={15} /> Proveedor
          </button>
          <button
            onClick={() => { setActionError(null); setShowPurchaseModal(true); }}
            className="btn btn--primary btn--sm"
            style={{ gap: 8 }}
          >
            <Plus size={15} /> Nueva Compra
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 24 }}>
        <Search size={16} style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: "var(--text-muted)", pointerEvents: "none",
        }} />
        <input
          type="text"
          placeholder="Buscar compras o proveedores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            ...inputStyle,
            width: "100%",
            padding: "10px 14px 10px 38px",
            borderRadius: "var(--radius-md)",
            fontSize: "0.9rem",
          }}
        />
      </div>

      {/* Error banner (acciones sobre lista: anular compra, eliminar proveedor) */}
      {actionError && !showSupplierModal && !showPurchaseModal && (
        <div style={{
          marginBottom: 20, padding: "12px 16px", borderRadius: "var(--radius-md)",
          background: "var(--danger-soft)", border: "1px solid var(--danger-border)",
          color: "var(--danger)", fontSize: "0.84rem", fontWeight: 600,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <X size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Proveedores */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Building2 size={15} style={{ color: "var(--text-muted)" }} />
          <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
            Proveedores
          </span>
          <span style={{
            fontSize: "0.72rem", color: "var(--text-muted)",
            background: "var(--bg-elevated)", padding: "1px 8px",
            borderRadius: "var(--radius-full)", border: "1px solid var(--border-light)",
          }}>
            {suppliers.length}
          </span>
        </div>
        {supplierFiltered.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            Sin proveedores registrados
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {supplierFiltered.map((s) => (
              <div key={s.id} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {s.contactName && `${s.contactName} · `}{s.phone || s.cuit || "—"}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteSupplier(s.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", padding: 6, borderRadius: "var(--radius-sm)",
                    transition: "color var(--transition-fast)",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Compras */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Truck size={15} style={{ color: "var(--text-muted)" }} />
          <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
            Historial de Compras
          </span>
          <span style={{
            fontSize: "0.72rem", color: "var(--text-muted)",
            background: "var(--bg-elevated)", padding: "1px 8px",
            borderRadius: "var(--radius-full)", border: "1px solid var(--border-light)",
          }}>
            {purchases.length}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px 24px" }}>
            <div className="empty-state__icon">
              <Truck size={24} />
            </div>
            <p className="empty-state__title">Sin compras registradas</p>
            <p className="empty-state__desc">Registrá tu primera compra a proveedor.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((p) => (
              <div key={p.id} className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Building2 size={15} style={{ color: "var(--text-muted)" }} />
                    <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      {p.supplier.name}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={12} />
                      {new Date(p.date).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
                      {formatCurrency(p.total)}
                    </span>
                    <span className={`badge ${
                      p.status === "completed" ? "badge--success" :
                      p.status === "cancelled" ? "badge--danger" :
                      "badge--warning"
                    }`}>
                      {p.status === "completed" ? "Completada" : p.status === "cancelled" ? "Cancelada" : "Pendiente"}
                    </span>
                    <button
                      onClick={() => handleDeletePurchase(p.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-muted)", padding: 6, borderRadius: "var(--radius-sm)",
                        transition: "color var(--transition-fast)",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {p.items.map((item) => (
                    <span key={item.id} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: "0.75rem", color: "var(--text-secondary)",
                      background: "var(--bg-elevated)", border: "1px solid var(--border-light)",
                      padding: "3px 10px", borderRadius: "var(--radius-full)",
                    }}>
                      <Package size={11} style={{ color: "var(--text-muted)" }} />
                      {item.product.emoji} {item.product.name}
                      <span style={{ color: "var(--text-muted)" }}>×</span>
                      {item.quantity} {item.unit}
                      <span style={{ color: "var(--border)", margin: "0 2px" }}>|</span>
                      {formatCurrency(item.unitCost)}/{item.unit}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal: Proveedor */}
      {showSupplierModal && (
        <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "var(--radius-sm)",
                  background: "var(--primary-soft)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Building2 size={16} style={{ color: "var(--primary)" }} />
                </div>
                <h3 className="modal__title">Nuevo Proveedor</h3>
              </div>
              <button className="modal__close" onClick={() => setShowSupplierModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { placeholder: "Nombre *", field: "name" },
                { placeholder: "Contacto", field: "contactName" },
                { placeholder: "Teléfono", field: "phone" },
                { placeholder: "Email", field: "email" },
                { placeholder: "CUIT", field: "cuit" },
              ] as { placeholder: string; field: keyof typeof supplierForm }[]).map(({ placeholder, field }) => (
                <input
                  key={field}
                  className={inputCls}
                  style={inputStyle}
                  placeholder={placeholder}
                  value={supplierForm[field]}
                  onChange={(e) => setSupplierForm({ ...supplierForm, [field]: e.target.value })}
                />
              ))}
            </div>
            <div style={{ padding: "0 24px 20px" }}>
              {actionError && (
                <div style={{
                  marginBottom: 12, padding: "10px 12px", borderRadius: "var(--radius-md)",
                  background: "var(--danger-soft)", border: "1px solid var(--danger-border)",
                  color: "var(--danger)", fontSize: "0.82rem", fontWeight: 600,
                }}>
                  {actionError}
                </div>
              )}
              <button
                onClick={handleCreateSupplier}
                disabled={saving || !supplierForm.name}
                className="btn btn--primary"
                style={{ width: "100%", justifyContent: "center", gap: 8 }}
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                Guardar Proveedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Compra */}
      {showPurchaseModal && (
        <div className="modal-overlay" onClick={() => setShowPurchaseModal(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal__header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "var(--radius-sm)",
                  background: "var(--primary-soft)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Truck size={16} style={{ color: "var(--primary)" }} />
                </div>
                <h3 className="modal__title">Nueva Compra</h3>
              </div>
              <button className="modal__close" onClick={() => setShowPurchaseModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "calc(90vh - 140px)" }}>
              {/* Form fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <select
                  value={purchaseForm.supplierId}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                  className={inputCls}
                  style={selectStyle}
                >
                  <option value="">Seleccionar proveedor *</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <select
                  value={purchaseForm.paymentMethod}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}
                  className={inputCls}
                  style={selectStyle}
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                </select>

                <textarea
                  placeholder="Notas (opcional)"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  className={inputCls}
                  style={{ ...inputStyle, resize: "none", height: 64 }}
                />
              </div>

              {/* Items */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Productos
                  </span>
                  <button
                    onClick={addItemToPurchase}
                    className="btn btn--ghost btn--sm"
                    style={{ gap: 5, fontSize: "0.78rem" }}
                  >
                    <Plus size={13} /> Agregar producto
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {purchaseForm.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 12px", background: "var(--bg-secondary)",
                      border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)",
                    }}>
                      <select
                        value={item.productId}
                        onChange={(e) => updatePurchaseItem(idx, "productId", e.target.value)}
                        style={{ ...selectStyle, flex: 1, padding: "6px 10px", borderRadius: "var(--radius-sm)", fontSize: "0.83rem" }}
                      >
                        <option value="">Producto</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Cant"
                        value={item.quantity || ""}
                        onChange={(e) => updatePurchaseItem(idx, "quantity", Number(e.target.value))}
                        style={{ ...inputStyle, width: 72, padding: "6px 8px", borderRadius: "var(--radius-sm)", fontSize: "0.83rem", textAlign: "center" }}
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => updatePurchaseItem(idx, "unit", e.target.value)}
                        style={{ ...selectStyle, width: 52, padding: "6px 4px", borderRadius: "var(--radius-sm)", fontSize: "0.83rem" }}
                      >
                        <option>kg</option><option>un</option><option>lt</option>
                      </select>
                      <input
                        type="number"
                        placeholder="$/u"
                        value={item.unitCost || ""}
                        onChange={(e) => updatePurchaseItem(idx, "unitCost", Number(e.target.value))}
                        style={{ ...inputStyle, width: 88, padding: "6px 8px", borderRadius: "var(--radius-sm)", fontSize: "0.83rem", textAlign: "right" }}
                      />
                      <button
                        onClick={() => removePurchaseItem(idx)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--text-muted)", padding: 4, borderRadius: "var(--radius-sm)",
                          transition: "color var(--transition-fast)", flexShrink: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                {purchaseForm.items.length === 0 && (
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic", padding: "16px 0", textAlign: "center" }}>
                    Agregá al menos un producto a la compra.
                  </p>
                )}
              </div>

              {/* Total preview */}
              {purchaseForm.items.length > 0 && (
                <div style={{
                  marginTop: 16, padding: "12px 16px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-light)",
                  borderRadius: "var(--radius-md)", display: "flex",
                  justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total estimado</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>
                    {formatCurrency(purchaseForm.items.reduce((a, i) => a + i.unitCost * i.quantity, 0))}
                  </span>
                </div>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-light)" }}>
              {actionError && (
                <div style={{
                  marginBottom: 12, padding: "10px 12px", borderRadius: "var(--radius-md)",
                  background: "var(--danger-soft)", border: "1px solid var(--danger-border)",
                  color: "var(--danger)", fontSize: "0.82rem", fontWeight: 600,
                }}>
                  {actionError}
                </div>
              )}
              <button
                onClick={handleCreatePurchase}
                disabled={saving || !purchaseForm.supplierId || purchaseForm.items.length === 0 || purchaseForm.items.some((i) => !i.productId || i.unitCost <= 0)}
                className="btn btn--primary"
                style={{ width: "100%", justifyContent: "center", gap: 8 }}
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                Confirmar Compra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
