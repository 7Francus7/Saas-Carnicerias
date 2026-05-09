"use client";

import { useEffect, useState } from "react";
import {
  Truck, Plus, Search, Building2, Calendar,
  X, Loader2, Trash2, Package, DollarSign,
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

  const handleCreateSupplier = async () => {
    setSaving(true);
    await createSupplier(supplierForm);
    setShowSupplierModal(false);
    setSupplierForm({ name: "", contactName: "", phone: "", email: "", address: "", cuit: "", notes: "" });
    await load();
    setSaving(false);
  };

  const handleCreatePurchase = async () => {
    setSaving(true);
    await createPurchase(purchaseForm);
    setShowPurchaseModal(false);
    setPurchaseForm({ supplierId: "", paymentMethod: "cash", notes: "", items: [] });
    await load();
    setSaving(false);
  };

  const handleDeletePurchase = async (id: string) => {
    await deletePurchase(id);
    await load();
  };

  const addItemToPurchase = () => {
    setPurchaseForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, unit: "kg", unitCost: 0 }],
    }));
  };

  const updatePurchaseItem = (idx: number, field: string, value: any) => {
    setPurchaseForm((prev) => {
      const items = [...prev.items];
      (items[idx] as any)[field] = value;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Truck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Compras</h1>
            <p className="text-sm text-gray-500">Gestión de compras y proveedores</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Building2 className="w-4 h-4" /> Proveedor
          </button>
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Compra
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar compras o proveedores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {/* Proveedores */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-700">Proveedores</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{suppliers.length}</span>
        </div>
        {supplierFiltered.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin proveedores registrados</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {supplierFiltered.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">
                    {s.contactName && `${s.contactName} · `}{s.phone || s.cuit || "—"}
                  </p>
                </div>
                <button
                  onClick={() => deleteSupplier(s.id).then(load)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Compras */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-700">Historial de Compras</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{purchases.length}</span>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin compras registradas</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{p.supplier.name}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(p.date).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-600">{formatCurrency(p.total)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === "completed" ? "bg-green-100 text-green-700" :
                      p.status === "cancelled" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{p.status}</span>
                    <button
                      onClick={() => handleDeletePurchase(p.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.items.map((item) => (
                    <span key={item.id} className="text-xs bg-gray-50 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Package className="w-3 h-3 text-gray-400" />
                      {item.product.emoji} {item.product.name}
                      <span className="text-gray-400 mx-1">×</span>
                      {item.quantity} {item.unit}
                      <span className="text-gray-300 mx-1">|</span>
                      <DollarSign className="w-3 h-3 text-gray-400" />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Nuevo Proveedor</h3>
              <button onClick={() => setShowSupplierModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Nombre *" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
              <input className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Contacto" value={supplierForm.contactName} onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })} />
              <input className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Teléfono" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
              <input className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
              <input className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="CUIT" value={supplierForm.cuit} onChange={(e) => setSupplierForm({ ...supplierForm, cuit: e.target.value })} />
            </div>
            <button
              onClick={handleCreateSupplier}
              disabled={saving || !supplierForm.name}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar Proveedor
            </button>
          </div>
        </div>
      )}

      {/* Modal: Compra */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Nueva Compra</h3>
              <button onClick={() => setShowPurchaseModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <select
                value={purchaseForm.supplierId}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              >
                <option value="">Seleccionar proveedor *</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={purchaseForm.paymentMethod}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              >
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
              </select>

              <textarea
                placeholder="Notas"
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-16"
              />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-gray-700">Productos</h4>
                <button onClick={addItemToPurchase} className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Agregar producto
                </button>
              </div>
              {purchaseForm.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <select
                    value={item.productId}
                    onChange={(e) => updatePurchaseItem(idx, "productId", e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Cant" value={item.quantity || ""}
                    onChange={(e) => updatePurchaseItem(idx, "quantity", Number(e.target.value))}
                    className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center" />
                  <select value={item.unit}
                    onChange={(e) => updatePurchaseItem(idx, "unit", e.target.value)}
                    className="w-14 px-1 py-1.5 border border-gray-200 rounded-lg text-sm">
                    <option>kg</option><option>un</option><option>lt</option>
                  </select>
                  <input type="number" placeholder="$" value={item.unitCost || ""}
                    onChange={(e) => updatePurchaseItem(idx, "unitCost", Number(e.target.value))}
                    className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right" />
                  <button onClick={() => removePurchaseItem(idx)} className="p-1 text-gray-300 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total preview */}
            {purchaseForm.items.length > 0 && (
              <div className="text-right text-sm font-bold text-emerald-600">
                Total: {formatCurrency(purchaseForm.items.reduce((a, i) => a + i.unitCost * i.quantity, 0))}
              </div>
            )}

            <button
              onClick={handleCreatePurchase}
              disabled={saving || !purchaseForm.supplierId || purchaseForm.items.length === 0 || purchaseForm.items.some((i) => !i.productId || i.unitCost <= 0)}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar Compra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
