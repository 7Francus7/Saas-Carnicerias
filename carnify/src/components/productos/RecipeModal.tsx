"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X, Plus, Trash2, Loader2, Calculator,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { getRecipes, upsertRecipeItem, deleteRecipeItem } from "@/actions/recipes";
import { useProductsStore, type Product } from "@/stores/useProductsStore";

interface RecipeItemRow {
  id?: string;
  inputId: string;
  inputName: string;
  inputEmoji: string;
  quantity: number;
  unit: string;
  yieldFactor: number;
  inputPrice?: number;
}

interface Props {
  product: Product;
  onClose: () => void;
}

type RecipeMap = Awaited<ReturnType<typeof getRecipes>>;

const fieldStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-light)",
  color: "var(--text-primary)",
  borderRadius: "var(--radius-md)",
  fontFamily: "var(--font-body)",
  outline: "none",
  fontSize: "0.85rem",
  padding: "7px 10px",
};

export default function RecipeModal({ product, onClose }: Props) {
  const products = useProductsStore((s) => s.products);
  const [recipes, setRecipes] = useState<RecipeMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<RecipeItemRow[]>([]);

  const load = useCallback(async () => {
    const data = await getRecipes();
    setRecipes(data);
    const existing = (data[product.id] || []).map((r) => ({
      id: r.id,
      inputId: r.input.id,
      inputName: r.input.name,
      inputEmoji: r.input.emoji,
      quantity: r.quantity,
      unit: r.unit,
      yieldFactor: r.yieldFactor,
      inputPrice: r.input.price,
    }));
    setItems(existing);
    setLoading(false);
  }, [product.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { inputId: "", inputName: "", inputEmoji: "", quantity: 1, unit: "kg", yieldFactor: 1 },
    ]);
  };

  const updateItem = <K extends keyof RecipeItemRow>(idx: number, field: K, value: RecipeItemRow[K]) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "inputId") {
        const p = products.find((pr) => pr.id === value);
        if (p) {
          next[idx].inputName = p.name;
          next[idx].inputEmoji = p.emoji;
          next[idx].inputPrice = p.price;
        }
      }
      return next;
    });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const item of items) {
      if (!item.inputId) continue;
      await upsertRecipeItem({
        outputId: product.id,
        inputId: item.inputId,
        quantity: item.quantity,
        unit: item.unit,
        yieldFactor: item.yieldFactor,
      });
    }
    const currentIds = items.filter((i) => i.inputId).map((i) => i.inputId);
    const existing = recipes[product.id] || [];
    for (const ex of existing) {
      if (!currentIds.includes(ex.inputId)) {
        await deleteRecipeItem(product.id, ex.inputId);
      }
    }
    setSaving(false);
    onClose();
  };

  const totalCost = items.reduce((acc, i) => {
    if (i.inputPrice) {
      return acc + (i.inputPrice * i.quantity) / (i.yieldFactor || 1);
    }
    return acc;
  }, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{product.emoji}</span>
            <div>
              <h3 className="modal__title">{product.name}</h3>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                BOM / Receta — PLU {product.plu}
              </span>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "calc(90vh - 160px)" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <Loader2 size={22} className="animate-spin" style={{ color: "var(--primary)" }} />
            </div>
          ) : (
            <>
              {/* Items */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Insumos
                  </span>
                  <button
                    onClick={addItem}
                    className="btn btn--ghost btn--sm"
                    style={{ gap: 5, fontSize: "0.78rem" }}
                  >
                    <Plus size={13} /> Agregar insumo
                  </button>
                </div>

                {items.length === 0 && (
                  <div style={{
                    padding: "24px 16px", textAlign: "center",
                    background: "var(--bg-secondary)", border: "1px dashed var(--border-light)",
                    borderRadius: "var(--radius-md)",
                  }}>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      Sin insumos definidos. Agregá los ingredientes del producto elaborado.
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 12px", background: "var(--bg-secondary)",
                      border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)",
                    }}>
                      <select
                        value={item.inputId}
                        onChange={(e) => updateItem(idx, "inputId", e.target.value)}
                        style={{ ...fieldStyle, flex: 1, minWidth: 0 }}
                      >
                        <option value="">Seleccionar insumo</option>
                        {products
                          .filter((p) => p.id !== product.id)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.emoji} {p.name} ({formatCurrency(p.price)}/{p.unit})
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Cant"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                        style={{ ...fieldStyle, width: 68, textAlign: "center" }}
                        step="0.1"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(idx, "unit", e.target.value)}
                        style={{ ...fieldStyle, width: 50 }}
                      >
                        <option>kg</option><option>un</option><option>lt</option>
                      </select>
                      <button
                        onClick={() => removeItem(idx)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--text-muted)", padding: 4, borderRadius: "var(--radius-sm)",
                          transition: "color var(--transition-fast)", flexShrink: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost preview */}
              {items.length > 0 && totalCost > 0 && (
                <div style={{
                  background: "var(--bg-elevated)", border: "1px solid var(--border-light)",
                  borderRadius: "var(--radius-md)", padding: "14px 16px",
                  display: "flex", flexDirection: "column", gap: 8, marginBottom: 16,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Calculator size={14} style={{ color: "var(--text-muted)" }} />
                      Costo de receta estimado
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Precio de venta</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-secondary)" }}>
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <div style={{
                    height: 1, background: "var(--border-light)", margin: "2px 0",
                  }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Margen estimado</span>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontWeight: 700,
                      color: product.price > totalCost ? "var(--success)" : "var(--danger)",
                    }}>
                      {product.price > 0
                        ? `${Math.round(((product.price - totalCost) / product.price) * 100)}%`
                        : "—"}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{
          padding: "16px 24px", borderTop: "1px solid var(--border-light)",
          display: "flex", gap: 10,
        }}>
          <button
            onClick={onClose}
            className="btn btn--ghost"
            style={{ flex: 1, justifyContent: "center" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="btn btn--primary"
            style={{ flex: 1, justifyContent: "center", gap: 8 }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Guardar Receta
          </button>
        </div>
      </div>
    </div>
  );
}
