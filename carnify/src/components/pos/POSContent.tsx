"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, ShoppingCart, Trash2, X, Wallet,
  CreditCard, Smartphone, QrCode, UserPlus,
  Scan, CheckCircle, AlertCircle,
} from "lucide-react";
import {
  PRODUCT_CATEGORIES, PAYMENT_METHODS,
  formatCurrency,
} from "@/lib/constants";
import { usePOSStore } from "@/stores/usePOSStore";
import { useProductsStore } from "@/stores/useProductsStore";
import { useCajaStore, mapDbSessionToStore } from "@/stores/useCajaStore";
import type { ClientProfile } from "@/stores/useClientStore";
import { getProducts } from "@/actions/products";
import { getCurrentSession, recordSale as dbRecordSale } from "@/actions/caja";
import { getClients, addSaleToAccount as dbAddSaleToAccount } from "@/actions/clients";

// ── Barcode parsing ─────────────────────────────────────────────────────────
// Scale EAN-13 format: 2 [PLU 5 digits] [weight in grams 5 digits] [check digit]
function parseScaleBarcode(barcode: string): { plu: string; weightKg: number } | null {
  if (barcode.length !== 13 || !barcode.startsWith("2")) return null;
  if (!/^\d{13}$/.test(barcode)) return null;
  const plu = barcode.slice(1, 6);
  const weightGrams = parseInt(barcode.slice(6, 11), 10);
  if (isNaN(weightGrams) || weightGrams <= 0) return null;
  return { plu, weightKg: weightGrams / 1000 };
}

// ── Scan flash types ────────────────────────────────────────────────────────
type ScanResult =
  | { ok: true;  product: import("@/stores/useProductsStore").Product; weightKg: number; total: number }
  | { ok: false; message: string }
  | null;

export default function POSContent() {
  const { cart, addToCart, removeFromCart, clearCart, total } = usePOSStore();
  const products = useProductsStore((s) => s.products);
  const setProducts = useProductsStore((s) => s.setProducts);
  const { currentSession, hydrate } = useCajaStore();
  const [clients, setClients] = useState<ClientProfile[]>([]);

  const loadSession = useCallback(async () => {
    const s = await getCurrentSession();
    if (s) hydrate(mapDbSessionToStore(s), []);
    else hydrate(null, []);
  }, [hydrate]);

  useEffect(() => {
    loadSession();
    if (products.length === 0) {
      getProducts().then((data) => setProducts(data as import("@/stores/useProductsStore").Product[]));
    }
    getClients().then((data) =>
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
  }, [loadSession]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [activeProduct, setActiveProduct] = useState<typeof products[0] | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastVentaId, setLastVentaId] = useState<string | null>(null);
  const [paymentSplits, setPaymentSplits] = useState<{ method: string; amount: number }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [weightValue, setWeightValue] = useState("");
  
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // PLU map rebuilt when products change
  const pluMap = useMemo(() => new Map(products.map((p) => [p.plu, p])), [products]);

  // ── Barcode scanner buffer ─────────────────────────────────────────────
  const scanBuffer = useRef("");
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processScan = useCallback((barcode: string) => {
    const parsed = parseScaleBarcode(barcode);

    if (!parsed) {
      const byPlu = pluMap.get(barcode.padStart(5, "0"));
      if (byPlu) {
        if (byPlu.unit === "un") {
          addToCart({ id: `${byPlu.id}_${Date.now()}`, name: byPlu.name, price: byPlu.price, quantity: 1, unit: "un", emoji: byPlu.emoji });
          setScanResult({ ok: true, product: byPlu, weightKg: 1, total: byPlu.price });
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
        const lineTotal = product.price * parsed.weightKg;
        addToCart({
          id: `${product.id}_${Date.now()}`,
          name: product.name,
          price: product.price,
          quantity: parsed.weightKg,
          unit: "kg",
          emoji: product.emoji,
        });
        setScanResult({ ok: true, product, weightKg: parsed.weightKg, total: lineTotal });
      }
    }
    setTimeout(() => setScanResult(null), 3000);
  }, [addToCart, pluMap]);

  // Global keydown listener — barcode scanners type the full code in < 80 ms
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input that's not the search bar
      const tag = (e.target as HTMLElement).tagName;
      const isSearchInput = (e.target as HTMLElement).classList.contains("pos-search__input");
      if ((tag === "INPUT" || tag === "TEXTAREA") && !isSearchInput) return;

      if (e.key === "Enter") {
        if (scanBuffer.current.length >= 8) {
          processScan(scanBuffer.current);
        }
        scanBuffer.current = "";
        if (scanTimer.current) clearTimeout(scanTimer.current);
        return;
      }

      if (e.key.length === 1) {
        scanBuffer.current += e.key;
        if (scanTimer.current) clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => {
          scanBuffer.current = "";
        }, 80);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [processScan]);

  // ── Product helpers ──────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "todos" || p.category.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleProductClick = (product: typeof products[0]) => {
    if (product.unit === "kg") {
      setActiveProduct(product);
      setWeightValue("");
      setShowWeightModal(true);
    } else {
      addToCart({ id: `${product.id}_${Date.now()}`, name: product.name, price: product.price, quantity: 1, unit: "un", emoji: product.emoji });
    }
  };

  const confirmWeight = () => {
    if (!activeProduct) return;
    const weight = parseFloat(weightValue.replace(",", "."));
    if (!isNaN(weight) && weight > 0) {
      addToCart({ id: `${activeProduct.id}_${Date.now()}`, name: activeProduct.name, price: activeProduct.price, quantity: weight, unit: "kg", emoji: activeProduct.emoji });
      setShowWeightModal(false);
    }
  };

  const handleCompleteSale = async () => {
    const fiadoTotal = paymentSplits
      .filter(s => s.method === 'fiado')
      .reduce((acc, s) => acc + s.amount, 0);

    const cartItems = cart.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit,
      emoji: item.emoji,
    }));

    await dbRecordSale(total, paymentSplits, cartItems, selectedClientId || undefined, selectedClient?.name);

    if (fiadoTotal > 0 && selectedClientId) {
      await dbAddSaleToAccount(
        selectedClientId,
        fiadoTotal,
        `Venta Ticket #${Date.now().toString().slice(-4)} (POS)`
      );
    }

    await loadSession();
    setLastVentaId(`v-${Date.now()}`);
    setShowCheckoutModal(false);
    setShowSuccessModal(true);
  };

  const handleFinishSuccess = () => {
    clearCart();
    setSelectedClientId(null);
    setShowSuccessModal(false);
    setLastVentaId(null);
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
      <h2>Carnify</h2>
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
              type="text"
              placeholder="Buscar producto..."
              className="pos-search__input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="pos-categories">
            <button
              className={`pos-category ${selectedCategory === "todos" ? "pos-category--active" : ""}`}
              onClick={() => setSelectedCategory("todos")}
            >
              Todos
            </button>
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`pos-category ${selectedCategory === cat.label.toLowerCase() ? "pos-category--active" : ""}`}
                onClick={() => setSelectedCategory(cat.label.toLowerCase())}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pos-grid">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="pos-card"
              onClick={() => handleProductClick(product)}
            >
              <div className="pos-card__emoji-wrap">
                <div className="pos-card__emoji">{product.emoji}</div>
              </div>
              <div className="pos-card__name">{product.name}</div>
              <div className="pos-card__price">
                {formatCurrency(product.price)} / {product.unit}
              </div>
              <div className="pos-card__plu">PLU {product.plu}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Cart ── */}
      <div className="pos-sidebar">
        <div className="pos-cart">
          <div className="pos-cart__header">
            <div className="pos-cart__title">
              <ShoppingCart size={20} />
              Carrito
              {cart.length > 0 && (
                <span className="pos-cart__count">{cart.length}</span>
              )}
            </div>
            <button className="pos-cart__clear" onClick={clearCart}>
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
              onClick={() => setShowCheckoutModal(true)}
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
                  <span className="weight-product-info__subtext">{formatCurrency(activeProduct.price)} / kg</span>
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
                    {formatCurrency((parseFloat(weightValue.replace(",", ".")) || 0) * activeProduct.price)}
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
                          <span style={{ color: selectedClient.balance > selectedClient.creditLimit ? "var(--danger)" : "var(--success)" }}>
                            {selectedClient.balance > selectedClient.creditLimit ? "Excedido" : "Al día"}
                          </span>
                        </div>
                        <div className="client-status-indicator__row">
                          <span>Saldo disponible:</span>
                          <strong>{formatCurrency(Math.max(0, selectedClient.creditLimit - selectedClient.balance))}</strong>
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

                  <div className="checkout-actions">
                    <button 
                      className="btn btn--primary btn--full btn--large" 
                      onClick={handleCompleteSale}
                      disabled={
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
