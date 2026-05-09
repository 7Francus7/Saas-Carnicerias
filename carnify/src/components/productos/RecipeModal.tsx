"use client";

import { useEffect, useState } from "react";
import {
  X, Plus, Trash2, Loader2, Package, Beef, Calculator,
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

export default function RecipeModal({ product, onClose }: Props) {
  const products = useProductsStore((s) => s.products);
  const [recipes, setRecipes] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<RecipeItemRow[]>([]);

  const load = async () => {
    setLoading(true);
    const data = await getRecipes();
    setRecipes(data);
    const existing = (data[product.id] || []).map((r: any) => ({
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
  };

  useEffect(() => { load(); }, [product.id]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { inputId: "", inputName: "", inputEmoji: "", quantity: 1, unit: "kg", yieldFactor: 1 },
    ]);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{product.emoji}</span>
            <div>
              <h3 className="text-lg font-bold">{product.name}</h3>
              <p className="text-xs text-gray-400">Receta / BOM — {product.plu}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-gray-700">Insumos</h4>
                <button
                  onClick={addItem}
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Agregar insumo
                </button>
              </div>
              {items.length === 0 && (
                <p className="text-sm text-gray-400 italic py-4 text-center">
                  Sin insumos definidos. Agregá los ingredientes del producto elaborado.
                </p>
              )}
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                  <select
                    value={item.inputId}
                    onChange={(e) => updateItem(idx, "inputId", e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Seleccionar insumo</option>
                    {products
                      .filter((p) => p.id !== product.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.emoji} {p.name} (${p.price}/{p.unit})
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Cant"
                    value={item.quantity || ""}
                    onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center"
                    step="0.1"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(idx, "unit", e.target.value)}
                    className="w-12 px-1 py-1.5 border border-gray-200 rounded-lg text-sm"
                  >
                    <option>kg</option><option>un</option><option>lt</option>
                  </select>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    rto:{item.yieldFactor || 1}
                  </span>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Cost preview */}
            {items.length > 0 && totalCost > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Calculator className="w-4 h-4" /> Costo receta estimado
                  </span>
                  <span className="font-bold text-emerald-700">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Precio venta actual</span>
                  <span className="font-medium">{formatCurrency(product.price)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Margen estimado</span>
                  <span className={`font-bold ${product.price > totalCost ? "text-emerald-600" : "text-red-600"}`}>
                    {product.price > 0
                      ? `${Math.round(((product.price - totalCost) / product.price) * 100)}%`
                      : "—"}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar Receta
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
