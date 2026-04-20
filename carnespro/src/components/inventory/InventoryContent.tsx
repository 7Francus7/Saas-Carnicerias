"use client";

import { useState } from "react";
import { 
  Package, Search, Filter, Plus, ArrowDownLeft, 
  ArrowUpRight, AlertTriangle, History, X,
  Truck, Calendar, Tag, ChevronDown
} from "lucide-react";
import { 
  MOCK_STOCK_LEVELS, POS_PRODUCTS, formatCurrency, 
  formatNumber 
} from "@/lib/constants";
import { useStockStore, StockMovement } from "@/stores/useStockStore";

export default function InventoryContent() {
  const { movements, addMovement } = useStockStore();
  const [search, setSearch] = useState("");
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');

  // New movement form state
  const [newEntry, setNewEntry] = useState({
    productId: "",
    quantity: "",
    supplier: "",
    note: ""
  });

  const filteredStock = MOCK_STOCK_LEVELS.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const product = POS_PRODUCTS.find(p => p.id === newEntry.productId);
    if (!product) return;

    const movement: StockMovement = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type: 'entry',
      productName: product.name,
      quantity: parseFloat(newEntry.quantity),
      unit: product.unit,
      supplier: newEntry.supplier,
      note: newEntry.note
    };

    addMovement(movement);
    setShowEntryModal(false);
    setNewEntry({ productId: "", quantity: "", supplier: "", note: "" });
    alert(`Ingreso registrado: ${product.name} +${newEntry.quantity} ${product.unit}`);
  };

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <div className="inventory-title">
          <h1>Gestión de Inventario</h1>
          <p>Control de stock y entrada de mercadería</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowEntryModal(true)}>
          <Plus size={18} />
          Registrar Entrada
        </button>
      </div>

      <div className="inventory-stats">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">
            <Package size={20} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Total Productos</span>
            <span className="stat-card__value">124</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--orange">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Stock Bajo</span>
            <span className="stat-card__value">12</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <ArrowDownLeft size={20} />
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Ingresos del Mes</span>
            <span className="stat-card__value">2.450 kg</span>
          </div>
        </div>
      </div>

      <div className="inventory-tabs">
        <button 
          className={`inventory-tab ${activeTab === 'stock' ? 'inventory-tab--active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          <Package size={16} />
          Stock Actual
        </button>
        <button 
          className={`inventory-tab ${activeTab === 'history' ? 'inventory-tab--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          Historial de Movimientos
        </button>
      </div>

      {activeTab === 'stock' ? (
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
            <button className="btn btn--ghost">
              <Filter size={18} />
              Filtros
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Stock Actual</th>
                  <th>Stock Mínimo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="table-product">
                        <div className="table-product__emoji">🥩</div>
                        <div className="table-product__info">
                          <span className="table-product__name">{item.name}</span>
                          <span className="table-product__cat">Corte Vacuno</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="table-stock">
                        <span className="table-stock__value">{item.current} {item.unit}</span>
                        <div className="table-stock__bar">
                          <div 
                            className={`table-stock__progress ${item.percentage < 30 ? 'bg-danger' : item.percentage < 50 ? 'bg-warning' : 'bg-success'}`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>{item.max / 2} {item.unit}</td>
                    <td>
                      <span className={`status-badge status-badge--${item.percentage < 30 ? 'danger' : item.percentage < 50 ? 'warning' : 'success'}`}>
                        {item.percentage < 30 ? 'Crítico' : item.percentage < 50 ? 'Bajo' : 'Normal'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon">
                        <History size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="inventory-view">
          <div className="movement-list">
            {movements.map(m => (
              <div key={m.id} className="movement-card">
                <div className={`movement-icon movement-icon--${m.type}`}>
                  {m.type === 'entry' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div className="movement-details">
                  <div className="movement-row">
                    <span className="movement-product">{m.productName}</span>
                    <span className={`movement-qty movement-qty--${m.type}`}>
                      {m.type === 'entry' ? '+' : '-'}{m.quantity} {m.unit}
                    </span>
                  </div>
                  <div className="movement-row">
                    <span className="movement-meta">
                      <Calendar size={12} /> {new Date(m.date).toLocaleString()}
                    </span>
                    {m.supplier && (
                      <span className="movement-meta">
                        <Truck size={12} /> {m.supplier}
                      </span>
                    )}
                  </div>
                  {m.note && <p className="movement-note">{m.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Entry Modal (Ingreso de Mercadería) ── */}
      {showEntryModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Registrar Entrada de Mercadería</h3>
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
                    onChange={(e) => setNewEntry({...newEntry, productId: e.target.value})}
                  >
                    <option value="">Seleccionar producto...</option>
                    {POS_PRODUCTS.map(p => (
                      <option key={p.id} value={p.id}>{p.emoji} {p.name} ({p.unit})</option>
                    ))}
                  </select>
                  <ChevronDown className="select-icon" size={18} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cantidad</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    placeholder="0.00" 
                    required
                    value={newEntry.quantity}
                    onChange={(e) => setNewEntry({...newEntry, quantity: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Costo por Unidad (Opcional)</label>
                  <input type="number" className="form-input" placeholder="$ 0.00" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Proveedor</label>
                <div className="input-with-icon">
                  <Truck className="input-icon" size={18} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Nombre del frigorífico o proveedor"
                    value={newEntry.supplier}
                    onChange={(e) => setNewEntry({...newEntry, supplier: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <textarea 
                  className="form-input form-textarea" 
                  placeholder="Ej: Ingreso de media res, mercadería para fin de semana..."
                  value={newEntry.note}
                  onChange={(e) => setNewEntry({...newEntry, note: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowEntryModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary">
                  Confirmar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .inventory-container {
          padding: 32px;
          animation: fadeIn 0.4s ease-out;
        }

        .inventory-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .inventory-title h1 {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .inventory-title p {
          color: var(--text-tertiary);
          font-size: 0.95rem;
        }

        .inventory-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          padding: 24px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .stat-card__icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-card__icon--blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .stat-card__icon--orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .stat-card__icon--green { background: rgba(34, 197, 94, 0.1); color: #22c55e; }

        .stat-card__label {
          display: block;
          font-size: 0.85rem;
          color: var(--text-tertiary);
          margin-bottom: 4px;
        }

        .stat-card__value {
          display: block;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          font-family: var(--font-mono);
        }

        .inventory-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid var(--border-light);
          margin-bottom: 24px;
        }

        .inventory-tab {
          padding: 12px 20px;
          border: none;
          background: none;
          color: var(--text-muted);
          font-size: 0.9rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          position: relative;
          transition: all var(--transition-fast);
        }

        .inventory-tab:hover {
          color: var(--text-primary);
        }

        .inventory-tab--active {
          color: var(--primary);
        }

        .inventory-tab--active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--primary);
        }

        .inventory-filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }

        .inventory-search {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .inventory-search__icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .inventory-search__input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 10px 10px 10px 40px;
          color: var(--text-primary);
          outline: none;
        }

        .inventory-table-container {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .inventory-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .inventory-table th {
          padding: 16px 24px;
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .inventory-table td {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-light);
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .table-product {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .table-product__emoji {
          width: 40px;
          height: 40px;
          background: var(--bg-secondary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .table-product__name {
          display: block;
          font-weight: 700;
          color: var(--text-primary);
        }

        .table-product__cat {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .table-stock {
          width: 150px;
        }

        .table-stock__value {
          display: block;
          font-family: var(--font-mono);
          margin-bottom: 4px;
          font-weight: 600;
        }

        .table-stock__bar {
          height: 6px;
          background: var(--bg-secondary);
          border-radius: 3px;
          overflow: hidden;
        }

        .table-stock__progress {
          height: 100%;
          transition: width 0.3s ease;
        }

        .movement-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .movement-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          padding: 16px;
          border-radius: var(--radius-md);
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .movement-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .movement-icon--entry { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        .movement-icon--exit { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .movement-details { flex: 1; }

        .movement-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }

        .movement-product {
          font-weight: 700;
          color: var(--text-primary);
        }

        .movement-qty {
          font-family: var(--font-mono);
          font-weight: 800;
          font-size: 1.1rem;
        }

        .movement-qty--entry { color: #22c55e; }
        .movement-qty--exit { color: var(--text-primary); }

        .movement-meta {
          color: var(--text-tertiary);
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .movement-note {
          margin-top: 8px;
          font-size: 0.85rem;
          color: var(--text-muted);
          background: var(--bg-secondary);
          padding: 8px 12px;
          border-radius: 6px;
          border-left: 3px solid var(--border-light);
        }

        /* Form Styles */
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          color: var(--text-primary);
          font-family: var(--font-body);
          outline: none;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          border-color: var(--primary);
        }

        .form-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .select-wrapper {
          position: relative;
        }

        .select-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .form-input select {
          appearance: none;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .input-with-icon .form-input {
          padding-left: 40px;
        }
      `}</style>
    </div>
  );
}
