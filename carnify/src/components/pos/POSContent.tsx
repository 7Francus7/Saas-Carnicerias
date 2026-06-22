"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, ShoppingCart, Trash2, X,
  Scan, CheckCircle, AlertCircle,
  Package, BadgeDollarSign, Scale,
  Plus, Minus,
} from "lucide-react";
import {
  PRODUCT_CATEGORIES, PAYMENT_METHODS,
  formatCurrency, formatNumber,
} from "@/lib/constants";
import { usePOSStore } from "@/stores/usePOSStore";
import { useProductsStore } from "@/stores/useProductsStore";
import { useCajaStore, mapDbSessionToStore } from "@/stores/useCajaStore";
import type { ClientProfile } from "@/stores/useClientStore";
import type { Product } from "@/stores/useProductsStore";
import { getProducts } from "@/actions/products";
import { getCurrentSession, recordSale as dbRecordSale } from "@/actions/caja";
import { getClientsForPos } from "@/actions/clients";
import { getPosRuntimeSettings } from "@/actions/settings";
import { getInventoryForPos } from "@/actions/stock";
import { DEFAULT_POS, type PosSettings } from "@/stores/useSettingsStore";
import { ProductCard } from "./ProductCard";

// ── Barcode parsing ─────────────────────────────────────────────────────────
// Scale EAN-13 format: 2 [PLU 5 digits] [weight in grams 5 digits] [check digit]
// Also supports: 21 [PLU 5 digits] [weight 5 digits] (some scales), 
// GS1-14: 9 [PLU 5 digits] [weight 3 digits] [check], 
// and bare PLU codes (just the number)
function parseScaleBarcode(barcode: string): { plu: string; weightKg: number } | null {
  if (!/^\d+$/.test(barcode)) return null;
  const len = barcode.length;

  // EAN-13 starting with 2 (most common scale format)
  if (len === 13 && barcode.startsWith("2")) {
    const plu = barcode.slice(1, 6);
    const weightGrams = parseInt(barcode.slice(6, 11), 10);
    if (!isNaN(weightGrams) && weightGrams > 0) return { plu, weightKg: weightGrams / 1000 };
  }

  // EAN-13 starting with 21 (alternative scale format)
  if (len === 13 && barcode.startsWith("21")) {
    const plu = barcode.slice(2, 7);
    const weightGrams = parseInt(barcode.slice(7, 12), 10);
    if (!isNaN(weightGrams) && weightGrams > 0) return { plu, weightKg: weightGrams / 1000 };
  }

  // EAN-13 starting with 4 (PLU + price embedded — some scales use this)
  if (len === 13 && (barcode.startsWith("4") || barcode.startsWith("5"))) {
    const plu = barcode.slice(1, 6);
    const priceCentavos = parseInt(barcode.slice(6, 12), 10);
    if (!isNaN(priceCentavos) && priceCentavos > 0) {
      // These encode price, not weight. Return weight=1, caller uses price override
      return { plu, weightKg: 1 };
    }
  }

  // 8-digit: [PLU 5 digits] [weight in grams 3 digits] (compact format)
  if (len === 8) {
    const plu = barcode.slice(0, 5);
    const weightGrams = parseInt(barcode.slice(5, 8), 10);
    if (!isNaN(weightGrams) && weightGrams > 0) return { plu, weightKg: weightGrams / 1000 };
  }

  return null;
}

// ── Scan flash types ────────────────────────────────────────────────────────
type ScanResult =
  | { ok: true;  product: import("@/stores/useProductsStore").Product; weightKg: number; total: number }
  | { ok: false; message: string }
  | null;

// Precio efectivo (con descuento vigente). Funcion pura a nivel modulo:
// no depende de estado, evita recrearla en cada render.
function getEffectivePrice(p: Product): number {
  if (p.discountPercent && p.discountPercent > 0) {
    if (p.discountEndDate) {
      const end = new Date(p.discountEndDate);
      if (end < new Date()) return p.price; // Vencido — sin descuento
    }
    return p.price * (1 - p.discountPercent / 100);
  }
  return p.price;
}

export default function POSContent() {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, total } = usePOSStore();
  const products = useProductsStore((s) => s.products);
  const setProducts = useProductsStore((s) => s.setProducts);
  const { currentSession, hydrate } = useCajaStore();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const itemIdRef = useRef(0);

  const createCartItemId = useCallback((productId: string) => {
    itemIdRef.current += 1;
    return `${productId}_${itemIdRef.current}`;
  }, []);

  const loadSession = useCallback(async () => {
    const s = await getCurrentSession();
    if (s) hydrate(mapDbSessionToStore(s), []);
    else hydrate(null, []);
  }, [hydrate]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState<{ method: string; amount: number }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [inventoryByProduct, setInventoryByProduct] = useState<Record<string, { quantity: number; unit: string }>>({});
  const [businessName, setBusinessName] = useState("Carnify");
  const [posSettings, setPosSettings] = useState<PosSettings>(DEFAULT_POS);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [weightValue, setWeightValue] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    loadSession();
    if (products.length === 0) {
      getProducts().then((data) => setProducts(data as Product[]));
    }
    getClientsForPos().then((data) =>
      setClients(
        data.map((c) => ({
          id: c.id,
          name: c.name,
          dni: c.dni,
          phone: c.phone,
          address: c.address,
          email: c.email,
          notes: c.notes ?? "",
          creditLimit: c.creditLimit,
          balance: c.balance,
          status: c.status as ClientProfile["status"],
          lastActivity: new Date(c.createdAt).toISOString(),
          createdAt: new Date(c.createdAt).toISOString(),
          movements: [],
          periods: [],
        }))
      )
    );
    getPosRuntimeSettings().then((settings) => {
      if (!settings) return;
      setBusinessName(settings.nombre?.trim() || "Carnify");
      setPosSettings({
        defaultPaymentMethod:
          (settings.defaultPaymentMethod as PosSettings["defaultPaymentMethod"]) ??
          DEFAULT_POS.defaultPaymentMethod,
        stockAlertThreshold:
          settings.stockAlertThreshold ?? DEFAULT_POS.stockAlertThreshold,
        requireConfirmOnCheckout:
          settings.requireConfirmOnCheckout ?? DEFAULT_POS.requireConfirmOnCheckout,
        enforceStock:
          settings.enforceStock ?? DEFAULT_POS.enforceStock,
      });
    });
    getInventoryForPos().then((rows) => {
      setInventoryByProduct(
        Object.fromEntries(rows.map((row) => [row.productId, { quantity: row.quantity, unit: row.unit }]))
      );
    });
  }, [loadSession, products.length, setProducts]);
  
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // PLU map rebuilt when products change
  const pluMap = useMemo(() => new Map(products.map((p) => [p.plu, p])), [products]);
  const reservedQuantityByProduct = useMemo(() => {
    const reserved: Record<string, number> = {};
    cart.forEach((item) => {
      reserved[item.productId] = (reserved[item.productId] ?? 0) + item.quantity;
    });
    return reserved;
  }, [cart]);

  const getAvailableStock = useCallback((productId: string) => {
    const inventory = inventoryByProduct[productId];
    if (!inventory) return posSettings.enforceStock ? 0 : null;
    return inventory.quantity - (reservedQuantityByProduct[productId] ?? 0);
  }, [inventoryByProduct, posSettings.enforceStock, reservedQuantityByProduct]);

  const validateStockAvailability = useCallback((product: Product, requestedQuantity: number) => {
    if (!posSettings.enforceStock) return null;
    const available = getAvailableStock(product.id);
    if (available === null) return null;
    if (available < requestedQuantity) {
      return `Stock insuficiente para ${product.name}. Disponible: ${Math.max(0, available).toFixed(product.unit === "kg" ? 3 : 0)} ${product.unit}.`;
    }
    return null;
  }, [getAvailableStock, posSettings.enforceStock]);

  // ── Barcode scanner buffer ─────────────────────────────────────────────
  const scanBuffer = useRef("");
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processScan = useCallback((barcode: string) => {
    const parsed = parseScaleBarcode(barcode);

    if (!parsed) {
      const byPlu = pluMap.get(barcode.padStart(5, "0"));
      if (byPlu) {
        if (byPlu.unit === "un") {
          const stockError = validateStockAvailability(byPlu, 1);
          if (stockError) {
            setScanResult({ ok: false, message: stockError });
            setTimeout(() => setScanResult(null), 3000);
            return;
          }
          const effectiveUnitPrice = getEffectivePrice(byPlu);
          addToCart({ id: createCartItemId(byPlu.id), productId: byPlu.id, name: byPlu.name, price: effectiveUnitPrice, quantity: 1, unit: "un", emoji: byPlu.emoji });
          setScanResult({ ok: true, product: byPlu, weightKg: 1, total: effectiveUnitPrice });
        } else {
          setScanResult({ ok: false, message: `${byPlu.name} requiere peso — usá el ticket de la balanza` });
        }
      } else {
        setScanResult({ ok: false, message: `Código no reconocido: ${barcode}` });
      }
    } else {
      const product = pluMap.get(parsed.plu);
      if (!product) {
        setScanResult({ ok: false, message: `PLU ${parsed.plu} no registrado` });
      } else {
        const effectivePrice = getEffectivePrice(product);
        const lineTotal = effectivePrice * parsed.weightKg;
        const stockError = validateStockAvailability(product, parsed.weightKg);
        if (stockError) {
          setScanResult({ ok: false, message: stockError });
          setTimeout(() => setScanResult(null), 3000);
          return;
        }
        addToCart({
          id: createCartItemId(product.id),
          productId: product.id,
          name: product.name,
          price: effectivePrice,
          quantity: parsed.weightKg,
          unit: "kg",
          emoji: product.emoji,
        });
        setScanResult({ ok: true, product, weightKg: parsed.weightKg, total: lineTotal });
      }
    }
    setTimeout(() => setScanResult(null), 3000);
  }, [addToCart, createCartItemId, pluMap, validateStockAvailability]);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Refs for unstable values used in keydown handler (avoid listener re-registration)
  const searchRef = useRef(search);
  const pluMapRef = useRef(pluMap);
  const processScanRef = useRef(processScan);
  const validateStockRef = useRef(validateStockAvailability);
  const showWeightModalRef = useRef(showWeightModal);
  const showCheckoutModalRef = useRef(showCheckoutModal);
  const showSuccessModalRef = useRef(showSuccessModal);

  useEffect(() => {
    searchRef.current = search;
    pluMapRef.current = pluMap;
    processScanRef.current = processScan;
    validateStockRef.current = validateStockAvailability;
    showWeightModalRef.current = showWeightModal;
    showCheckoutModalRef.current = showCheckoutModal;
    showSuccessModalRef.current = showSuccessModal;
  }, [pluMap, processScan, search, showCheckoutModal, showSuccessModal, showWeightModal, validateStockAvailability]);

  // Global keydown listener — barcode scanners + keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isSearchInput = searchInputRef.current === e.target;

      // F2: Focus search
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // F8: Open checkout (with stock validation bypass if holding Shift)
      if (e.key === "F8") {
        e.preventDefault();
        const posBtn = document.querySelector(".pos-checkout-btn") as HTMLButtonElement;
        if (posBtn && !posBtn.disabled) posBtn.click();
        return;
      }

      // Escape: Close any open modal
      if (e.key === "Escape") {
        if (showWeightModalRef.current) { setShowWeightModal(false); return; }
        if (showCheckoutModalRef.current) { setShowCheckoutModal(false); return; }
        if (showSuccessModalRef.current) { clearCart(); setShowSuccessModal(false); return; }
        return;
      }

      // Ignore if user is typing in an input that's not the search bar
      if ((tag === "INPUT" || tag === "TEXTAREA") && !isSearchInput) return;

      if (e.key === "Enter") {
        const currentSearch = searchRef.current;
        if (currentSearch) {
          const padded = currentSearch.trim().padStart(5, "0");
          const bySearchPlu = pluMapRef.current.get(padded);
          if (bySearchPlu) {
            if (bySearchPlu.unit === "un") {
              const stockError = validateStockRef.current(bySearchPlu, 1);
              if (!stockError) {
                const effectiveSearchPrice = getEffectivePrice(bySearchPlu);
                addToCart({ id: createCartItemId(bySearchPlu.id), productId: bySearchPlu.id, name: bySearchPlu.name, price: effectiveSearchPrice, quantity: 1, unit: "un", emoji: bySearchPlu.emoji });
                setScanResult({ ok: true, product: bySearchPlu, weightKg: 1, total: effectiveSearchPrice });
                setTimeout(() => setScanResult(null), 2000);
              }
            }
            setSearch("");
            return;
          }
        }

        if (scanBuffer.current.length >= 6) {
          processScanRef.current(scanBuffer.current);
        }
        scanBuffer.current = "";
        if (scanTimer.current) clearTimeout(scanTimer.current);
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scanBuffer.current += e.key;
        if (scanTimer.current) clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => {
          scanBuffer.current = "";
        }, 80);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addToCart, clearCart, createCartItemId]);

  // ── Product helpers ──────────────────────────────────────────────────────
  // Memoizado: solo recalcula al cambiar productos, busqueda o categoria.
  // Busca por nombre y por PLU. La query se normaliza una sola vez.
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = q === "" || p.name.toLowerCase().includes(q) || p.plu.includes(q);
      const matchesCategory = selectedCategory === "todos" || p.category.toLowerCase() === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  // Estable (useCallback): evita romper el memo de ProductCard en cada render.
  const handleProductClick = useCallback((product: Product) => {
    const stockError = validateStockAvailability(product, 1);
    if (product.unit === "un" && stockError) {
      setScanResult({ ok: false, message: stockError });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    if (product.unit === "kg") {
      setActiveProduct(product);
      setWeightValue("");
      setShowWeightModal(true);
    } else {
      addToCart({ id: createCartItemId(product.id), productId: product.id, name: product.name, price: getEffectivePrice(product), quantity: 1, unit: "un", emoji: product.emoji });
    }
  }, [validateStockAvailability, addToCart, createCartItemId]);

  const confirmWeight = () => {
    if (!activeProduct) return;
    const weight = parseFloat(weightValue.replace(",", "."));
    if (!isNaN(weight) && weight > 0) {
      const stockError = validateStockAvailability(activeProduct, weight);
      if (stockError) {
        setScanResult({ ok: false, message: stockError });
        setTimeout(() => setScanResult(null), 3000);
        return;
      }
      addToCart({ id: createCartItemId(activeProduct.id), productId: activeProduct.id, name: activeProduct.name, price: getEffectivePrice(activeProduct), quantity: weight, unit: "kg", emoji: activeProduct.emoji });
      setShowWeightModal(false);
    }
  };

  // Stepper de cantidad para items por unidad (no aplica a kg).
  const incrementCartItem = (item: typeof cart[number]) => {
    const available = getAvailableStock(item.productId);
    if (available !== null && available <= 0) {
      setScanResult({ ok: false, message: `Stock insuficiente para ${item.name}` });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }
    updateQuantity(item.id, item.quantity + 1);
  };

  const decrementCartItem = (item: typeof cart[number]) => {
    if (item.quantity <= 1) removeFromCart(item.id);
    else updateQuantity(item.id, item.quantity - 1);
  };

  const openCheckout = () => {
    setCheckoutError(null);
    if (paymentSplits.length === 0) {
      setPaymentSplits([
        {
          method: posSettings.defaultPaymentMethod,
          amount: total,
        },
      ]);
    }
    setShowCheckoutModal(true);
  };

  const handleCompleteSale = async () => {
    if (submittingSale) return;
    setCheckoutError(null);
    if (paymentSplits.length === 0) {
      setCheckoutError("Elegi al menos un medio de pago.");
      return;
    }

    const splitTotal = paymentSplits.reduce((acc, split) => acc + split.amount, 0);
    if (Math.abs(splitTotal - total) > 0.01) {
      setCheckoutError("La suma de los pagos no coincide con el total de la venta.");
      return;
    }

    if (paymentSplits.some((split) => split.method === "fiado") && !selectedClientId) {
      setCheckoutError("Selecciona un cliente para registrar una venta fiada.");
      return;
    }

    if (posSettings.requireConfirmOnCheckout) {
      const confirmed = window.confirm(
        `Confirmar cobro por ${formatCurrency(total)} para registrar la venta.`
      );
      if (!confirmed) return;
    }

    const cartItems = cart.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit,
      emoji: item.emoji,
    }));

    setSubmittingSale(true);
    try {
      await dbRecordSale(
        total,
        paymentSplits,
        cartItems,
        selectedClientId || undefined,
        selectedClient?.name
      );

      await loadSession();
      const inventoryRows = await getInventoryForPos();
      setInventoryByProduct(
        Object.fromEntries(inventoryRows.map((row) => [row.productId, { quantity: row.quantity, unit: row.unit }]))
      );
      setShowCheckoutModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      setCheckoutError(
        msg && !msg.includes("Server Components render")
          ? msg
          : "No se pudo registrar la venta. Intentá de nuevo."
      );
    } finally {
      setSubmittingSale(false);
    }
  };

  const handleFinishSuccess = () => {
    clearCart();
    setPaymentSplits([]);
    setSelectedClientId(null);
    setClientSearch("");
    setCheckoutError(null);
    setShowSuccessModal(false);
  };

  const handlePrintTicket = () => {
    const date = new Date().toLocaleString("es-AR");
    const lines = cart.map((item) => {
      const qty = item.unit === "kg" ? `${item.quantity.toFixed(3)} kg` : `${item.quantity} un`;
      return `<tr><td>${item.emoji} ${item.name}</td><td>${qty}</td><td style="text-align:right">$${Math.round(item.price * item.quantity).toLocaleString("es-AR")}</td></tr>`;
    }).join("");
    const splitLines = paymentSplits.map((s) => {
      const label = s.method === "cash" ? "Efectivo" : s.method === "transfer" ? "Transferencia" : s.method === "card" ? "Tarjeta" : s.method === "link" ? "QR/Link" : "Cta. Cte.";
      return `<tr><td colspan="2">${label}</td><td style="text-align:right">$${Math.round(s.amount).toLocaleString("es-AR")}</td></tr>`;
    }).join("");
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title><style>
      body{font-family:monospace;font-size:13px;margin:16px;color:#000}
      h2{text-align:center;margin:0 0 4px}
      p.sub{text-align:center;color:#555;margin:0 0 12px;font-size:11px}
      table{width:100%;border-collapse:collapse}
      td{padding:3px 2px}
      .divider{border-top:1px dashed #000;margin:8px 0}
      .total{font-size:15px;font-weight:bold}
      .footer{text-align:center;margin-top:12px;font-size:10px;color:#777}
    </style></head><body>
      <h2>${businessName}</h2>
      <p class="sub">${date}</p>
      <div class="divider"></div>
      <table>${lines}</table>
      <div class="divider"></div>
      <table><tr class="total"><td colspan="2">TOTAL</td><td style="text-align:right">$${Math.round(total).toLocaleString("es-AR")}</td></tr>${splitLines}</table>
      <div class="divider"></div>
      <p class="footer">¡Gracias por su compra!</p>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
    handleFinishSuccess();
  };

  const updateSplitAmount = (index: number, amount: number) => {
    const newSplits = [...paymentSplits];
    newSplits[index].amount = amount;
    setPaymentSplits(newSplits);
  };

  const addSplitMethod = (methodId: string) => {
    if (paymentSplits.find(s => s.method === methodId)) return;
    const currentPaid = paymentSplits.reduce((acc, s) => acc + s.amount, 0);
    const remaining = Math.max(0, total - currentPaid);
    setPaymentSplits([...paymentSplits, { method: methodId, amount: remaining }]);
  };

  const removeSplit = (index: number) => {
    const method = paymentSplits[index].method;
    const newSplits = paymentSplits.filter((_, i) => i !== index);
    setPaymentSplits(newSplits);
    
    if (method === 'fiado' && !newSplits.some(s => s.method === 'fiado')) {
      setSelectedClientId(null);
    }
  };

  const totalPaid = paymentSplits.reduce((acc, s) => acc + s.amount, 0);
  const remainingToPay = total - totalPaid;
  const totalKgInCart = cart.filter((i) => i.unit === "kg").reduce((acc, item) => acc + item.quantity, 0);
  const unitItemsInCart = cart.filter((i) => i.unit !== "kg").reduce((acc, item) => acc + item.quantity, 0);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: products.length };
    products.forEach((product) => {
      const key = product.category.toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [products]);

  return (
    <div className="pos-layout">
      {/* ── Left: Products ── */}
      <div className="pos-main">
        <div className="pos-header">

          {/* Scan status bar */}
          <div className="pos-scan-bar">
            {scanResult === null ? (
              <div className="pos-scan-bar__idle">
                <Scan size={15} />
                <span>Listo para escanear — apuntá el lector al ticket de la balanza</span>
              </div>
            ) : scanResult.ok ? (
              <div className="pos-scan-bar__ok">
                <CheckCircle size={15} />
                <span>
                  <strong>{scanResult.product.name}</strong>
                  {" · "}{scanResult.weightKg.toFixed(3)} {scanResult.product.unit}
                  {" · "}{formatCurrency(scanResult.total)}
                </span>
              </div>
            ) : (
              <div className="pos-scan-bar__error">
                <AlertCircle size={15} />
                <span>{scanResult.message}</span>
              </div>
            )}
          </div>

          <div className="pos-search">
            <Search size={18} className="pos-search__icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar producto o PLU... (F2)"
              className="pos-search__input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="pos-operation-strip">
            <div className="pos-operation-metric">
              <ShoppingCart size={17} />
              <span>{cart.length} lineas</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <div className="pos-operation-metric">
              <Scale size={17} />
              <span>Peso</span>
              <strong>{totalKgInCart.toFixed(3)} kg</strong>
            </div>
            <div className="pos-operation-metric">
              <Package size={17} />
              <span>Unidades</span>
              <strong>{formatNumber(unitItemsInCart)}</strong>
            </div>
            <div className={`pos-operation-metric ${currentSession ? "pos-operation-metric--ok" : "pos-operation-metric--danger"}`}>
              <BadgeDollarSign size={17} />
              <span>Caja</span>
              <strong>{currentSession ? "Abierta" : "Cerrada"}</strong>
            </div>
          </div>

          <div className="pos-categories">
            <button
              className={`pos-category ${selectedCategory === "todos" ? "pos-category--active" : ""}`}
              onClick={() => setSelectedCategory("todos")}
            >
              Todos
              <span>{categoryCounts.todos ?? 0}</span>
            </button>
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`pos-category ${selectedCategory === cat.label.toLowerCase() ? "pos-category--active" : ""}`}
                onClick={() => setSelectedCategory(cat.label.toLowerCase())}
              >
                {cat.emoji} {cat.label}
                <span>{categoryCounts[cat.label.toLowerCase()] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pos-grid">
          {filteredProducts.length === 0 ? (
            <div className="pos-empty-state">
              <Package size={38} />
              <strong>No hay productos para esta busqueda</strong>
              <span>Probá con otro nombre, PLU o categoria.</span>
            </div>
          ) : filteredProducts.map((product) => {
            const stock = getAvailableStock(product.id);
            const effectivePrice = getEffectivePrice(product);
            return (
              <ProductCard
                key={product.id}
                product={product}
                isOutOfStock={stock !== null && stock <= 0}
                availableStock={stock}
                stockUnit={inventoryByProduct[product.id]?.unit ?? product.unit}
                stockAlertThreshold={posSettings.stockAlertThreshold}
                discountPrice={effectivePrice !== product.price ? effectivePrice : null}
                onSelect={handleProductClick}
              />
            );
          })}
        </div>
      </div>

      {/* ── Tablet cart toggle ── */}
      <div
        className={`pos-cart-backdrop${cartOpen ? " pos-cart-backdrop--visible" : ""}`}
        onClick={() => setCartOpen(false)}
      />
      <button
        className="pos-cart-toggle"
        onClick={() => setCartOpen((o) => !o)}
        aria-label="Abrir carrito"
      >
        <ShoppingCart size={18} />
        Carrito
        {cart.length > 0 && (
          <span className="pos-cart-toggle__badge">{cart.length}</span>
        )}
      </button>

      {/* ── Right: Cart ── */}
      <div className={`pos-sidebar${cartOpen ? " pos-sidebar--open" : ""}`}>
        <div className="pos-cart">
          <div className="pos-cart__header">
            <div className="pos-cart__title">
              <ShoppingCart size={20} />
              Carrito
              {cart.length > 0 && (
                <span className="pos-cart__count">{cart.length}</span>
              )}
            </div>
            <button
              className="pos-cart__clear"
              onClick={() => {
                if (cart.length === 0) return;
                if (window.confirm(`¿Seguro que querés vaciar el carrito? Se perderán ${cart.length} ítem(s).`)) {
                  clearCart();
                }
              }}
            >
              Vaciar
            </button>
          </div>

          <div className="pos-cart__items">
            {cart.length === 0 ? (
              <div className="pos-cart__empty">
                <Scan size={36} style={{ color: "var(--text-muted)" }} />
                <p>Escaneá un ticket o seleccioná un producto</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="pos-cart-item">
                  <div className="pos-cart-item__main">
                    <div className="pos-cart-item__emoji">{item.emoji}</div>
                    <div className="pos-cart-item__info">
                      <div className="pos-cart-item__name">{item.name}</div>
                      <div className="pos-cart-item__price">
                        {item.unit === "kg"
                          ? `${item.quantity.toFixed(3)} kg × ${formatCurrency(item.price)}`
                          : `${item.quantity} un × ${formatCurrency(item.price)}`}
                      </div>
                    </div>
                  </div>
                  <div className="pos-cart-item__actions">
                    {item.unit !== "kg" && (
                      <div className="pos-qty-stepper">
                        <button
                          className="pos-qty-stepper__btn"
                          onClick={() => decrementCartItem(item)}
                          aria-label="Quitar una unidad"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="pos-qty-stepper__value">{item.quantity}</span>
                        <button
                          className="pos-qty-stepper__btn"
                          onClick={() => incrementCartItem(item)}
                          aria-label="Agregar una unidad"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    )}
                    <div className="pos-cart-item__total">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                    <button className="pos-cart-item__remove" onClick={() => removeFromCart(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pos-cart__footer">
            <div className="pos-summary">
              <div className="pos-summary__row">
                <span>{cart.length} {cart.length === 1 ? "ítem" : "ítems"}</span>
                <span style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}>
                  {cart.filter((i) => i.unit === "kg").reduce((a, i) => a + i.quantity, 0).toFixed(3)} kg
                </span>
              </div>
              <div className="pos-summary__total">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            {!currentSession ? (
              <div className="pos-no-caja-warning">
                <AlertCircle size={16} />
                <span>Abrí la caja antes de vender</span>
              </div>
            ) : null}
            <button
              className="pos-checkout-btn"
              disabled={cart.length === 0 || !currentSession}
              onClick={openCheckout}
            >
              {!currentSession ? "Caja cerrada" : `Cobrar ${cart.length > 0 ? formatCurrency(total) : ""}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Peso manual ── */}
      {showWeightModal && activeProduct && (
        <div className="modal-overlay" onClick={() => setShowWeightModal(false)}>
          <div className="modal modal--weight" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="weight-product-info">
                <span className="weight-product-info__emoji">{activeProduct.emoji}</span>
                <div>
                  <h3 className="modal__title">{activeProduct.name}</h3>
                  <span className="weight-product-info__subtext">{formatCurrency(getEffectivePrice(activeProduct))} / kg</span>
                </div>
              </div>
              <button className="modal__close" onClick={() => setShowWeightModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal__content">
              <div className="weight-modal-body">
                <div className="weight-screen">
                  <div className="weight-screen__display">
                    <input
                      type="text"
                      className="weight-screen__input"
                      placeholder="0.000"
                      autoFocus
                      value={weightValue}
                      onChange={(e) => setWeightValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && confirmWeight()}
                    />
                    <span className="weight-screen__unit">kg</span>
                  </div>
                  <div className="weight-screen__total">
                    {formatCurrency((parseFloat(weightValue.replace(",", ".")) || 0) * getEffectivePrice(activeProduct))}
                  </div>
                </div>

                <div className="numpad">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0, "⌫"].map((val) => (
                    <button
                      key={val}
                      className={`numpad__btn ${val === "⌫" ? "numpad__btn--backspace" : ""}`}
                      onClick={() => {
                        if (val === "⌫") setWeightValue((prev) => prev.slice(0, -1));
                        else setWeightValue((prev) => prev + val);
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                <button className="weight-confirm-btn" onClick={confirmWeight}>
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Checkout ── */}
      {showCheckoutModal && (
        <div className="modal-overlay" onClick={() => setShowCheckoutModal(false)}>
          <div className="modal modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">Finalizar Venta</h3>
              <button className="modal__close" onClick={() => setShowCheckoutModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal__content checkout-grid">
              {/* Left Column: Summary & Total */}
              <div className="checkout-summary-column">
                <h4 className="checkout-section-title">Resumen</h4>
                <div className="checkout-items">
                  {cart.map((item) => (
                    <div key={item.id} className="checkout-item">
                      <div className="checkout-item__info">
                        <span className="checkout-item__emoji">{item.emoji}</span>
                        <div className="checkout-item__details">
                          <span className="checkout-item__name">{item.name}</span>
                          <span className="checkout-item__qty">
                            {item.unit === "kg" ? `${item.quantity.toFixed(3)} kg` : `${item.quantity} un`}
                          </span>
                        </div>
                      </div>
                      <span className="checkout-item__price">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="checkout-total">
                  <span>Total a cobrar</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Right Column: Payment Panel */}
              <div className="checkout-payment-panel">
                <div className="payment-panel-section">
                  <h4 className="checkout-section-title">Medios de Pago</h4>
                  
                  <div className="payment-splits">
                    {paymentSplits.map((split, idx) => {
                      const method = PAYMENT_METHODS.find(m => m.id === split.method);
                      return (
                        <div key={idx} className="payment-split-row animate-in">
                          <div className="payment-split-row__info">
                            <span className="payment-split-row__dot" style={{ background: method?.color }} />
                            <span className="payment-split-row__label">{method?.label}</span>
                          </div>
                          <div className="payment-split-row__actions">
                            <div className="payment-split-row__input-wrapper">
                              <span className="payment-split-row__currency">$</span>
                              <input 
                                type="number" 
                                className="payment-split-row__input"
                                value={split.amount || ""}
                                onChange={(e) => updateSplitAmount(idx, parseFloat(e.target.value) || 0)}
                                autoFocus={idx === paymentSplits.length - 1}
                              />
                            </div>
                            <button 
                              className="payment-split-row__remove" 
                              onClick={() => removeSplit(idx)}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="payment-method-selector">
                    <p className="payment-method-selector__hint">Agregar otro medio:</p>
                    <div className="payment-grid-mini">
                      {PAYMENT_METHODS.filter(m => !paymentSplits.find(s => s.method === m.id)).map((method) => (
                        <button
                          key={method.id}
                          className="payment-method-mini"
                          onClick={() => addSplitMethod(method.id)}
                          style={{ "--method-color": method.color } as React.CSSProperties}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Client Selection (Nested in Panel) */}
                {paymentSplits.some(s => s.method === "fiado") && (
                  <div className="checkout-client-selection animate-in">
                    <h4 className="checkout-section-title" style={{ fontSize: '0.9rem', marginBottom: 16 }}>Cliente Cuenta Cte.</h4>
                    
                    {!selectedClient ? (
                      <>
                        <div className="pos-search" style={{ marginBottom: 12 }}>
                          <Search size={16} className="pos-search__icon" />
                          <input
                            type="text"
                            placeholder="Buscar cliente por nombre..."
                            className="pos-search__input pos-search__input--sm"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                          />
                        </div>
                        
                        {clientSearch.length > 0 && (
                          <div className="client-mini-list">
                            {clients
                              .filter(c => 
                                c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                c.dni.includes(clientSearch)
                              )
                              .slice(0, 4)
                              .map(client => (
                                <button
                                  key={client.id}
                                  className="client-mini-card"
                                  onClick={() => setSelectedClientId(client.id)}
                                >
                                  <div className="client-mini-card__info">
                                    <span className="client-mini-card__name">{client.name}</span>
                                  </div>
                                  <div className="client-mini-card__balance">
                                    {formatCurrency(client.balance)}
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="selected-client-banner">
                        <div className="selected-client-banner__info">
                          <CheckCircle size={20} color="var(--success)" />
                          <div>
                            <span className="selected-client-banner__name">{selectedClient.name}</span>
                            <span className="selected-client-banner__dni">{selectedClient.dni}</span>
                          </div>
                        </div>
                        <button className="selected-client-banner__change" onClick={() => setSelectedClientId(null)}>
                          Cambiar
                        </button>
                      </div>
                    )}

                    {selectedClient && (
                      <div className="client-status-indicator">
                        <div className="client-status-indicator__row">
                          <span>Estado de cuenta:</span>
                          <span style={{ color: selectedClient.creditLimit > 0 && selectedClient.balance > selectedClient.creditLimit ? "var(--danger)" : "var(--success)" }}>
                            {selectedClient.creditLimit > 0 && selectedClient.balance > selectedClient.creditLimit ? "Excedido" : "Al día"}
                          </span>
                        </div>
                        <div className="client-status-indicator__row">
                          <span>Saldo disponible:</span>
                          <strong>{selectedClient.creditLimit > 0 ? formatCurrency(Math.max(0, selectedClient.creditLimit - selectedClient.balance)) : "Sin límite"}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="payment-panel-footer">
                  <div className="checkout-status">
                    {paymentSplits.length === 0 ? (
                      <div className="checkout-status__hint">Elige un medio de pago</div>
                    ) : remainingToPay > 0 ? (
                      <div className="checkout-status__pending">
                        Faltan: <strong>{formatCurrency(remainingToPay)}</strong>
                      </div>
                    ) : remainingToPay < 0 ? (
                      <div className="checkout-status__change">
                        Vuelto: <strong>{formatCurrency(Math.abs(remainingToPay))}</strong>
                      </div>
                    ) : (
                      <div className="checkout-status__complete">
                        <CheckCircle size={18} /> Pago completo
                      </div>
                    )}
                  </div>

                  {checkoutError && (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(239, 68, 68, 0.24)",
                        background: "rgba(239, 68, 68, 0.08)",
                        color: "var(--danger)",
                        fontSize: "0.84rem",
                        fontWeight: 600,
                      }}
                    >
                      {checkoutError}
                    </div>
                  )}

                  <div className="checkout-actions">
                    <button 
                      className="btn btn--primary btn--full btn--large" 
                      onClick={handleCompleteSale}
                      disabled={
                        submittingSale ||
                        paymentSplits.length === 0 ||
                        remainingToPay > 0 ||
                        (paymentSplits.some(s => s.method === "fiado") && !selectedClientId)
                      }
                    >
                      Confirmar cobro
                    </button>
                    <button className="btn btn--ghost btn--full" style={{ marginTop: 8 }} onClick={() => setShowCheckoutModal(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Success ── */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal animate-in" style={{ textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ 
                width: 72, height: 72, background: 'var(--success-soft)', 
                borderRadius: '50%', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', margin: '0 auto 16px' 
              }}>
                <CheckCircle size={40} color="var(--success)" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 8 }}>¡Venta Exitosa!</h2>
              <p className="text-muted">La transacción se ha registrado correctamente.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn--primary btn--full btn--large"
                onClick={handlePrintTicket}
              >
                Imprimir Ticket
              </button>
              <button 
                className="btn btn--ghost btn--full btn--large"
                onClick={handleFinishSuccess}
              >
                Finalizar sin imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
