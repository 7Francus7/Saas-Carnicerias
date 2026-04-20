"use client";

import { useState, useMemo } from "react";
import {
  Users, Search, UserPlus, Phone, CreditCard,
  ArrowUpRight, ArrowDownLeft, Wallet,
  X, CheckCircle2, MapPin, Hash, ShieldAlert,
  History, Edit3, Trash2, FileText, Download,
  Mail, StickyNote, TrendingUp, ReceiptText,
  Info, AlertTriangle, Package, Calendar,
  ChevronDown, ChevronRight, Archive, CheckCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { useClientStore, ClientProfile, ClientFormData, ClientMovement, ClientPeriod } from "@/stores/useClientStore";
import { downloadComprobantePago, downloadCartola } from "@/lib/pdfUtils";

type ModalType = 'none' | 'addClient' | 'editClient' | 'payment' | 'newSale' | 'deleteConfirm' | 'receipt' | 'closePeriod';
type FilterType = 'all' | 'debt' | 'overdue';
type TabType = 'movements' | 'history' | 'info';

const EMPTY_FORM: ClientFormData = {
  name: '', dni: '', phone: '', address: '',
  email: '', notes: '', creditLimit: 1000000, status: 'active'
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  other: 'Otro',
};

const METHOD_ICONS: Record<string, string> = {
  cash: '💵',
  transfer: '📱',
  card: '💳',
  other: '🔖',
};

export default function ClientsContent() {
  const { clients, selectedClientId, setSelectedClient, addClient, updateClient, deleteClient, addPayment, addSaleToAccount, closePeriod } = useClientStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<TabType>('movements');
  const [modal, setModal] = useState<ModalType>('none');

  const [clientForm, setClientForm] = useState<ClientFormData>(EMPTY_FORM);
  const [paymentForm, setPaymentForm] = useState({ amount: '', note: '', method: 'cash' });
  const [saleForm, setSaleForm] = useState({ amount: '', description: 'Venta libre en cuenta corriente' });
  const [lastReceipt, setLastReceipt] = useState<{ movement: ClientMovement; prevBalance: number } | null>(null);
  const [movementFilter, setMovementFilter] = useState<'all' | 'sale' | 'payment'>('all');
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find(c => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const filteredClients = useMemo(() => {
    let list = clients;
    if (filter === 'debt') list = list.filter(c => c.balance > 0);
    if (filter === 'overdue') list = list.filter(c => c.status === 'overdue');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.dni.includes(q) ||
        c.phone.includes(q)
      );
    }
    return list.slice().sort((a, b) => b.balance - a.balance);
  }, [clients, filter, search]);

  const filteredMovements = useMemo(() => {
    if (!selectedClient) return [];
    if (movementFilter === 'all') return selectedClient.movements;
    return selectedClient.movements.filter(m => m.type === movementFilter);
  }, [selectedClient, movementFilter]);

  const clientStats = useMemo(() => {
    if (!selectedClient) return null;
    const totalSales = selectedClient.movements.filter(m => m.type === 'sale').reduce((s, m) => s + m.amount, 0);
    const totalPaid = selectedClient.movements.filter(m => m.type === 'payment').reduce((s, m) => s + m.amount, 0);
    const salesCount = selectedClient.movements.filter(m => m.type === 'sale').length;
    return { totalSales, totalPaid, salesCount };
  }, [selectedClient]);

  const sidebarStats = useMemo(() => ({
    total: clients.length,
    withDebt: clients.filter(c => c.balance > 0).length,
    overdue: clients.filter(c => c.status === 'overdue').length,
    totalDebt: clients.reduce((s, c) => s + Math.max(0, c.balance), 0),
  }), [clients]);

  // ── Handlers ──────────────────────────────────────────

  function openAddClient() {
    setClientForm(EMPTY_FORM);
    setModal('addClient');
  }

  function openEditClient() {
    if (!selectedClient) return;
    setClientForm({
      name: selectedClient.name,
      dni: selectedClient.dni,
      phone: selectedClient.phone,
      address: selectedClient.address,
      email: selectedClient.email,
      notes: selectedClient.notes,
      creditLimit: selectedClient.creditLimit,
      status: selectedClient.status,
    });
    setModal('editClient');
  }

  function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    if (modal === 'addClient') {
      addClient(clientForm);
    } else {
      if (selectedClient) updateClient(selectedClient.id, clientForm);
    }
    setModal('none');
  }

  function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    const prevBalance = selectedClient.balance;
    const movement = addPayment(selectedClient.id, amount, paymentForm.note, paymentForm.method);
    if (movement) {
      setLastReceipt({ movement, prevBalance });
      setModal('receipt');
    }
    setPaymentForm({ amount: '', note: '', method: 'cash' });
  }

  function handleNewSale(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    const amount = parseFloat(saleForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    addSaleToAccount(selectedClient.id, amount, saleForm.description);
    setSaleForm({ amount: '', description: 'Venta libre en cuenta corriente' });
    setModal('none');
  }

  function handleDeleteClient() {
    if (!selectedClient) return;
    deleteClient(selectedClient.id);
    setModal('none');
  }

  function handleClosePeriod(reason: ClientPeriod['closedReason']) {
    if (!selectedClient) return;
    closePeriod(selectedClient.id, reason);
    setModal('none');
    setActiveTab('history');
  }

  function handleDownloadCartola() {
    if (selectedClient) downloadCartola(selectedClient);
  }

  function handleDownloadReceipt() {
    if (!selectedClient || !lastReceipt) return;
    downloadComprobantePago(selectedClient, lastReceipt.movement, lastReceipt.prevBalance);
  }

  function closeModal() {
    setModal('none');
  }

  // ── Helpers ───────────────────────────────────────────

  function relativeDate(dateStr: string): string {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`;
    return `Hace ${Math.floor(days / 30)} meses`;
  }

  // ── Sidebar ────────────────────────────────────────────

  const FilterTab = ({ value, label, count }: { value: FilterType; label: string; count: number }) => (
    <button
      className={`filter-tab ${filter === value ? 'filter-tab--active' : ''}`}
      onClick={() => setFilter(value)}
    >
      {label}
      <span className="filter-tab__count">{count}</span>
    </button>
  );

  // ── Main receipt preview ───────────────────────────────

  const ReceiptPreview = () => {
    if (!selectedClient || !lastReceipt) return null;
    const { movement, prevBalance } = lastReceipt;
    return (
      <div className="receipt-card">
        <div className="receipt-header">
          <div className="receipt-logo">🥩 CARNIFY</div>
          <div className="receipt-title">COMPROBANTE DE PAGO</div>
          <div className="receipt-meta">
            N° {movement.id.slice(-8).toUpperCase()}
            <span>·</span>
            {new Date(movement.date).toLocaleDateString('es-AR')} {new Date(movement.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="receipt-divider" />
        <div className="receipt-section">
          <div className="receipt-label">CLIENTE</div>
          <div className="receipt-client-name">{selectedClient.name}</div>
          <div className="receipt-client-meta">
            DNI: {selectedClient.dni}
            {selectedClient.phone && ` · Tel: ${selectedClient.phone}`}
          </div>
        </div>
        <div className="receipt-divider" />
        <div className="receipt-section">
          <div className="receipt-label">CONCEPTO</div>
          <div className="receipt-concept">{movement.description}</div>
          <div className="receipt-method">
            {METHOD_ICONS[movement.paymentMethod || 'cash']} {METHOD_LABELS[movement.paymentMethod || 'cash'] || 'Efectivo'}
          </div>
        </div>
        <div className="receipt-divider" />
        <div className="receipt-amounts">
          <div className="receipt-amount-row">
            <span>Saldo anterior</span>
            <span>{formatCurrency(prevBalance)}</span>
          </div>
          <div className="receipt-amount-row receipt-amount-row--paid">
            <span>Monto abonado</span>
            <span>− {formatCurrency(movement.amount)}</span>
          </div>
          <div className="receipt-divider receipt-divider--dark" />
          <div className={`receipt-amount-row receipt-amount-row--total ${movement.balanceAfter > 0 ? 'text-danger' : 'text-success'}`}>
            <span>SALDO RESTANTE</span>
            <span>{formatCurrency(movement.balanceAfter)}</span>
          </div>
        </div>
        <div className="receipt-divider" />
        <div className="receipt-footer">Gracias por su preferencia · Documento informativo</div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="crm-layout">
      {/* ── Sidebar ── */}
      <div className="crm-sidebar">
        <div className="crm-sidebar__header">
          <div className="sidebar-top">
            <div className="crm-search">
              <Search size={15} className="crm-search__icon" />
              <input
                type="text"
                placeholder="Buscar por nombre, DNI o tel..."
                className="crm-search__input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="crm-search__clear" onClick={() => setSearch('')}>
                  <X size={13} />
                </button>
              )}
            </div>
            <button className="btn-add" onClick={openAddClient} title="Nuevo cliente">
              <UserPlus size={17} />
            </button>
          </div>

          <div className="filter-tabs">
            <FilterTab value="all" label="Todos" count={sidebarStats.total} />
            <FilterTab value="debt" label="Con Deuda" count={sidebarStats.withDebt} />
            <FilterTab value="overdue" label="En Mora" count={sidebarStats.overdue} />
          </div>

          {sidebarStats.totalDebt > 0 && (
            <div className="sidebar-total-debt">
              <span>
                <TrendingUp size={18} />
                Deuda total:
                <strong>{formatCurrency(sidebarStats.totalDebt)}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="client-list">
          {filteredClients.length === 0 ? (
            <div className="client-list-empty">
              <Users size={32} />
              <p>Sin resultados</p>
            </div>
          ) : (
            filteredClients.map(client => (
              <div
                key={client.id}
                className={`client-item ${selectedClientId === client.id ? 'client-item--active' : ''} ${client.status === 'overdue' ? 'client-item--overdue' : ''}`}
                onClick={() => { setSelectedClient(client.id); setActiveTab('movements'); setMovementFilter('all'); }}
              >
                <div className={`client-item__avatar ${client.status === 'overdue' ? 'avatar--danger' : client.status === 'blocked' ? 'avatar--muted' : 'avatar--default'}`}>
                  {client.name.charAt(0)}
                </div>
                <div className="client-item__info">
                  <div className="client-item__row1">
                    <div className="client-item__name">{client.name}</div>
                    <div className="client-item__date">{relativeDate(client.lastActivity)}</div>
                  </div>
                  <div className="client-item__sub">
                    {client.balance > 0 ? (
                      <span className={`debt-tag ${client.status === 'overdue' ? 'debt-tag--overdue' : 'debt-tag--debt'}`}>
                        {client.status === 'overdue' && <ShieldAlert size={10} />}
                        Debe {formatCurrency(client.balance)}
                      </span>
                    ) : (
                      <span className="debt-tag debt-tag--ok">
                        <CheckCircle2 size={10} /> Al día
                      </span>
                    )}
                    {client.phone && <span className="client-item__phone">{client.phone}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main ── */}
      <div className="crm-main">
        {!selectedClient ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={64} strokeWidth={1.5} />
            </div>
            <h2>Gestión de Clientes</h2>
            <p>
              Bienvenido al centro de gestión. Acá podés llevar el control total de cuentas corrientes, 
              registrar cobranzas y fidelizar a tus clientes premium.
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn btn--primary btn--large" onClick={openAddClient}>
                <UserPlus size={18} /> Registrar Nuevo Cliente
              </button>
            </div>
            
            <div style={{ 
              marginTop: 64, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 24, maxWidth: 800, width: '100%' 
            }}>
              <div style={{ padding: 24, background: 'var(--surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)' }}>
                <TrendingUp size={24} color="var(--primary)" style={{ marginBottom: 16 }} />
                <h4 style={{ fontWeight: 800, marginBottom: 8 }}>Deuda Total</h4>
                <div style={{ fontSize: '1.25rem', fontWeight: 1000, color: 'var(--danger)' }}>{formatCurrency(sidebarStats.totalDebt)}</div>
              </div>
              <div style={{ padding: 24, background: 'var(--surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)' }}>
                <Users size={24} color="var(--primary)" style={{ marginBottom: 16 }} />
                <h4 style={{ fontWeight: 800, marginBottom: 8 }}>Total Clientes</h4>
                <div style={{ fontSize: '1.25rem', fontWeight: 1000 }}>{sidebarStats.total}</div>
              </div>
              <div style={{ padding: 24, background: 'var(--surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)' }}>
                <ShieldAlert size={24} color="var(--danger)" style={{ marginBottom: 16 }} />
                <h4 style={{ fontWeight: 800, marginBottom: 8 }}>En Mora</h4>
                <div style={{ fontSize: '1.25rem', fontWeight: 1000, color: 'var(--danger)' }}>{sidebarStats.overdue}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="client-details">
            {/* Profile Header */}
            <div className="client-profile-header">
              <div className="profile-hero">
                <div className={`profile-avatar ${selectedClient.status === 'overdue' ? 'avatar--danger' : selectedClient.status === 'blocked' ? 'avatar--muted' : 'avatar--default'}`}>
                  {selectedClient.name.charAt(0)}
                </div>
                <div className="profile-info">
                  <div className="profile-title-row">
                    <h1>{selectedClient.name}</h1>
                    <span className={`status-badge status-badge--${selectedClient.status}`}>
                      {selectedClient.status === 'active' ? 'Activo' : selectedClient.status === 'overdue' ? 'En Mora' : 'Bloqueado'}
                    </span>
                  </div>
                  <div className="profile-meta">
                    {selectedClient.dni && <span><Hash size={13} /> {selectedClient.dni}</span>}
                    {selectedClient.phone && <span><Phone size={13} /> {selectedClient.phone}</span>}
                    {selectedClient.address && <span><MapPin size={13} /> {selectedClient.address}</span>}
                    {selectedClient.email && <span><Mail size={13} /> {selectedClient.email}</span>}
                  </div>
                </div>
              </div>
              <div className="header-actions">
                <button className="btn btn--ghost btn--sm" onClick={openEditClient} title="Editar cliente">
                  <Edit3 size={15} /> Editar
                </button>
                <button className="btn btn--ghost btn--sm btn--danger-ghost" onClick={() => setModal('deleteConfirm')} title="Eliminar cliente">
                  <Trash2 size={15} />
                </button>
                <div className="header-actions__sep" />
                <button className="btn btn--outline" onClick={() => setModal('payment')}>
                  <ArrowDownLeft size={16} /> Ingresar Pago
                </button>
                <button className="btn btn--primary" onClick={() => setModal('newSale')}>
                  <ArrowUpRight size={16} /> Venta Cta/Cte
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card summary-card--main">
                <div className="summary-card__icon"><Wallet size={22} /></div>
                <div>
                  <div className="summary-card__label">Saldo Deudor</div>
                  <div className={`summary-card__value ${selectedClient.balance > selectedClient.creditLimit ? 'text-danger' : ''}`}>
                    {formatCurrency(selectedClient.balance)}
                  </div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-card__icon"><CreditCard size={20} /></div>
                <div>
                  <div className="summary-card__label">Límite Crédito</div>
                  <div className="summary-card__value">{formatCurrency(selectedClient.creditLimit)}</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-card__icon"><CheckCircle2 size={20} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="summary-card__label">Crédito Disponible</div>
                  <div className={`summary-card__value ${selectedClient.creditLimit - selectedClient.balance < 0 ? 'text-danger' : 'text-success'}`}>
                    {formatCurrency(Math.max(0, selectedClient.creditLimit - selectedClient.balance))}
                  </div>
                  <div className="credit-bar">
                    <div
                      className={`credit-bar__fill ${selectedClient.balance > selectedClient.creditLimit ? 'credit-bar__fill--over' : ''}`}
                      style={{ width: `${Math.min(100, (selectedClient.balance / selectedClient.creditLimit) * 100)}%` }}
                    />
                  </div>
                  <div className="credit-bar__label">
                    {Math.min(100, Math.round((selectedClient.balance / selectedClient.creditLimit) * 100))}% usado
                  </div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-card__icon"><TrendingUp size={20} /></div>
                <div>
                  <div className="summary-card__label">Total Comprado</div>
                  <div className="summary-card__value">{formatCurrency(clientStats?.totalSales ?? 0)}</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'movements' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('movements')}
              >
                <History size={15} /> Movimientos
                {selectedClient.movements.length > 0 && (
                  <span className="tab__count">{selectedClient.movements.length}</span>
                )}
              </button>
              <button
                className={`tab ${activeTab === 'history' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <Archive size={15} /> Historial
                {(selectedClient.periods ?? []).length > 0 && (
                  <span className="tab__count">{(selectedClient.periods ?? []).length}</span>
                )}
              </button>
              <button
                className={`tab ${activeTab === 'info' ? 'tab--active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                <Info size={15} /> Información
              </button>
            </div>

            {/* Tab: Movimientos */}
            {activeTab === 'movements' && (
              <div className="ledger-section">
                <div className="ledger-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h3><History size={16} /> Cuenta Corriente</h3>
                    <div className="movement-filters">
                      {(['all', 'sale', 'payment'] as const).map(f => (
                        <button key={f}
                          className={`mvt-filter ${movementFilter === f ? 'mvt-filter--active' : ''}`}
                          onClick={() => setMovementFilter(f)}>
                          {f === 'all' ? 'Todos' : f === 'sale' ? 'Ventas' : 'Pagos'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selectedClient.movements.length > 0 && (
                      <button className="btn btn--outline btn--sm" onClick={() => setModal('closePeriod')}>
                        <Archive size={14} /> Cerrar período
                      </button>
                    )}
                    <button className="btn btn--outline btn--sm" onClick={handleDownloadCartola}>
                      <Download size={14} /> Cartola PDF
                    </button>
                  </div>
                </div>

                {selectedClient.movements.length === 0 ? (
                  <div className="ledger-empty">
                    <FileText size={40} />
                    <p>Sin movimientos registrados</p>
                  </div>
                ) : filteredMovements.length === 0 ? (
                  <div className="ledger-empty">
                    <FileText size={32} />
                    <p>Sin {movementFilter === 'sale' ? 'ventas' : 'pagos'} registrados</p>
                  </div>
                ) : (
                  <div className="ledger">
                    <div className="ledger-thead">
                      <span>Fecha</span>
                      <span>Descripción</span>
                      <span className="text-right">Método</span>
                      <span className="text-right">Debe (+)</span>
                      <span className="text-right">Haber (−)</span>
                      <span className="text-right">Saldo</span>
                    </div>
                    {filteredMovements.map(m => (
                      <div key={m.id} className={`ledger-row ${m.type === 'payment' ? 'ledger-row--payment' : ''}`}>
                        <div className="ledger-cell ledger-date">
                          {new Date(m.date).toLocaleDateString('es-AR')}
                          <span className="ledger-time">{new Date(m.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="ledger-cell ledger-desc">
                          <span className={`ledger-type-dot ${m.type === 'sale' ? 'dot--sale' : 'dot--payment'}`} />
                          {m.description}
                          {m.ticketId && <span className="ticket-badge">#{m.ticketId}</span>}
                        </div>
                        <div className="ledger-cell text-right ledger-method">
                          {m.type === 'payment' && m.paymentMethod
                            ? <span className="method-tag">{METHOD_ICONS[m.paymentMethod]} {METHOD_LABELS[m.paymentMethod] || m.paymentMethod}</span>
                            : <span className="ledger-muted">—</span>
                          }
                        </div>
                        <div className="ledger-cell text-right ledger-debit">
                          {m.type === 'sale'
                            ? <span className="amount-debit">+ {formatCurrency(m.amount)}</span>
                            : <span className="ledger-muted">—</span>
                          }
                        </div>
                        <div className="ledger-cell text-right ledger-credit">
                          {m.type === 'payment'
                            ? <span className="amount-credit">− {formatCurrency(m.amount)}</span>
                            : <span className="ledger-muted">—</span>
                          }
                        </div>
                        <div className={`ledger-cell text-right ledger-balance ${m.balanceAfter > 0 ? 'text-danger' : 'text-success'}`}>
                          {formatCurrency(m.balanceAfter)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {clientStats && selectedClient.movements.length > 0 && (
                  <div className="ledger-totals">
                    <span>Total comprado: <strong className="text-danger">{formatCurrency(clientStats.totalSales)}</strong></span>
                    <span>Total pagado: <strong className="text-success">{formatCurrency(clientStats.totalPaid)}</strong></span>
                    <span>Saldo actual: <strong className={selectedClient.balance > 0 ? 'text-danger' : 'text-success'}>{formatCurrency(selectedClient.balance)}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Historial */}
            {activeTab === 'history' && (
              <div className="history-section">
                {(selectedClient.periods ?? []).length === 0 ? (
                  <div className="ledger-empty">
                    <Archive size={40} />
                    <p>Sin períodos cerrados aún</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 280, textAlign: 'center' }}>
                      Los períodos se archivan automáticamente cuando la deuda queda en cero, o podés cerrarlos manualmente.
                    </span>
                  </div>
                ) : (
                  (selectedClient.periods ?? []).map(period => (
                    <div key={period.id} className="period-card">
                      <div
                        className="period-card__header"
                        onClick={() => setExpandedPeriod(expandedPeriod === period.id ? null : period.id)}
                      >
                        <div className="period-card__left">
                          <div className="period-card__icon">
                            {period.finalBalance === 0
                              ? <CheckCheck size={16} />
                              : <Archive size={16} />}
                          </div>
                          <div>
                            <div className="period-card__label">{period.label}</div>
                            <div className="period-card__dates">
                              {new Date(period.openedAt).toLocaleDateString('es-AR')}
                              {' → '}
                              {new Date(period.closedAt).toLocaleDateString('es-AR')}
                            </div>
                          </div>
                        </div>
                        <div className="period-card__right">
                          <span className={`period-badge ${period.closedReason === 'settled' ? 'period-badge--settled' : period.closedReason === 'month_end' ? 'period-badge--month' : 'period-badge--manual'}`}>
                            {period.closedReason === 'settled' ? 'Saldado' : period.closedReason === 'month_end' ? 'Fin de mes' : 'Manual'}
                          </span>
                          <div className="period-card__summary">
                            <span className="text-danger">{formatCurrency(period.totalSales)}</span>
                            <span style={{ color: 'var(--text-muted)' }}>·</span>
                            <span className="text-success">{formatCurrency(period.totalPaid)}</span>
                          </div>
                          {expandedPeriod === period.id ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                      </div>

                      {expandedPeriod === period.id && (
                        <div className="period-movements">
                          {period.movements.map(m => (
                            <div key={m.id} className={`period-movement ${m.type === 'payment' ? 'period-movement--payment' : ''}`}>
                              <span className={`ledger-type-dot ${m.type === 'sale' ? 'dot--sale' : 'dot--payment'}`} />
                              <div className="period-movement__info">
                                <span className="period-movement__desc">{m.description}</span>
                                <span className="period-movement__date">
                                  {new Date(m.date).toLocaleDateString('es-AR')} {new Date(m.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <span className={m.type === 'sale' ? 'amount-debit' : 'amount-credit'}>
                                {m.type === 'sale' ? '+' : '−'} {formatCurrency(m.amount)}
                              </span>
                            </div>
                          ))}
                          <div className="period-footer">
                            <span>Saldo final: <strong className={period.finalBalance > 0 ? 'text-danger' : 'text-success'}>{formatCurrency(period.finalBalance)}</strong></span>
                            <span>{period.movements.length} movimientos</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Info */}
            {activeTab === 'info' && (
              <div className="info-section">
                <div className="info-grid">
                  <div className="info-card">
                    <h4><Package size={15} /> Datos del Cliente</h4>
                    <div className="info-rows">
                      <div className="info-row"><span>Nombre</span><strong>{selectedClient.name}</strong></div>
                      <div className="info-row"><span>DNI / CUIT</span><strong>{selectedClient.dni || '—'}</strong></div>
                      <div className="info-row"><span>Teléfono</span><strong>{selectedClient.phone || '—'}</strong></div>
                      <div className="info-row"><span>Dirección</span><strong>{selectedClient.address || '—'}</strong></div>
                      <div className="info-row"><span>Email</span><strong>{selectedClient.email || '—'}</strong></div>
                      <div className="info-row">
                        <span>Estado</span>
                        <strong className={selectedClient.status === 'overdue' ? 'text-danger' : selectedClient.status === 'blocked' ? 'text-muted' : 'text-success'}>
                          {selectedClient.status === 'active' ? 'Activo' : selectedClient.status === 'overdue' ? 'En Mora' : 'Bloqueado'}
                        </strong>
                      </div>
                      <div className="info-row">
                        <span>Cliente desde</span>
                        <strong>{new Date(selectedClient.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                      </div>
                      <div className="info-row">
                        <span>Última actividad</span>
                        <strong>{new Date(selectedClient.lastActivity).toLocaleDateString('es-AR')}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="info-card">
                    <h4><TrendingUp size={15} /> Estadísticas</h4>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <div className="stat-value">{formatCurrency(clientStats?.totalSales ?? 0)}</div>
                        <div className="stat-label">Total comprado</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value text-success">{formatCurrency(clientStats?.totalPaid ?? 0)}</div>
                        <div className="stat-label">Total pagado</div>
                      </div>
                      <div className="stat-item">
                        <div className={`stat-value ${selectedClient.balance > 0 ? 'text-danger' : 'text-success'}`}>
                          {formatCurrency(selectedClient.balance)}
                        </div>
                        <div className="stat-label">Saldo actual</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">{clientStats?.salesCount ?? 0}</div>
                        <div className="stat-label">Compras realizadas</div>
                      </div>
                    </div>

                    {selectedClient.notes && (
                      <div className="info-notes">
                        <StickyNote size={13} />
                        <span>{selectedClient.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button className="btn btn--outline btn--sm info-edit-btn" onClick={openEditClient}>
                  <Edit3 size={14} /> Editar información
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}

      {/* Add / Edit Client */}
      {(modal === 'addClient' || modal === 'editClient') && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>{modal === 'addClient' ? 'Nuevo Cliente' : 'Editar Cliente'}</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveClient} className="modal__body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre completo *</label>
                  <input className="form-input" required placeholder="Ej: Juan Pérez"
                    value={clientForm.name}
                    onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">DNI / CUIT</label>
                  <input className="form-input" placeholder="20-12345678-9"
                    value={clientForm.dni}
                    onChange={e => setClientForm(f => ({ ...f, dni: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" placeholder="11-4567-8901"
                    value={clientForm.phone}
                    onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="cliente@email.com"
                    value={clientForm.email}
                    onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input className="form-input" placeholder="Av. Corrientes 1234, CABA"
                  value={clientForm.address}
                  onChange={e => setClientForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Límite de crédito (opcional)</label>
                  <input className="form-input" type="number" min={0}
                    placeholder="Sin límite por defecto"
                    value={clientForm.creditLimit === 1000000 ? '' : clientForm.creditLimit}
                    onChange={e => {
                      const val = e.target.value;
                      setClientForm(f => ({ ...f, creditLimit: val === '' ? 1000000 : parseFloat(val) || 0 }));
                    }} />
                </div>
                {modal === 'editClient' && (
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-input form-select"
                      value={clientForm.status}
                      onChange={e => setClientForm(f => ({ ...f, status: e.target.value as ClientFormData['status'] }))}>
                      <option value="active">Activo</option>
                      <option value="overdue">En Mora</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Notas internas</label>
                <textarea className="form-input form-textarea" placeholder="Preferencias, observaciones..."
                  value={clientForm.notes}
                  onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn--primary">
                  {modal === 'addClient' ? 'Crear cliente' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {modal === 'payment' && selectedClient && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Ingresar Pago</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handlePayment} className="modal__body">
              <div className="client-mini-card">
                <div className="mini-avatar">{selectedClient.name.charAt(0)}</div>
                <div>
                  <div className="mini-name">{selectedClient.name}</div>
                  <div className="mini-balance">Saldo deudor: <strong className="text-danger">{formatCurrency(selectedClient.balance)}</strong></div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Monto a abonar *</label>
                <div className="amount-input-wrap">
                  <span className="amount-input-prefix">$</span>
                  <input
                    className="form-input form-input--amount"
                    type="number" min={0.01} step={0.01} required
                    placeholder="0"
                    autoFocus
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                {selectedClient.balance > 0 && (
                  <div className="quick-amounts">
                    {[
                      { label: 'Saldar todo', value: selectedClient.balance },
                      ...(selectedClient.balance >= 2000 ? [{ label: '50%', value: Math.ceil(selectedClient.balance / 2) }] : []),
                      ...(selectedClient.balance > 10000 ? [{ label: '$10.000', value: 10000 }] : []),
                      ...(selectedClient.balance > 5000 ? [{ label: '$5.000', value: 5000 }] : []),
                    ].map(q => (
                      <button key={q.label} type="button" className="quick-amount-btn"
                        onClick={() => setPaymentForm(f => ({ ...f, amount: String(q.value) }))}>
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Método de pago</label>
                <div className="method-options">
                  {[
                    { id: 'cash', label: 'Efectivo', icon: '💵' },
                    { id: 'transfer', label: 'Transferencia', icon: '📱' },
                    { id: 'card', label: 'Tarjeta', icon: '💳' },
                    { id: 'other', label: 'Otro', icon: '🔖' },
                  ].map(m => (
                    <label key={m.id} className={`method-option ${paymentForm.method === m.id ? 'method-option--active' : ''}`}>
                      <input type="radio" name="method" value={m.id} checked={paymentForm.method === m.id}
                        onChange={() => setPaymentForm(f => ({ ...f, method: m.id }))} />
                      <span className="method-option__icon">{m.icon}</span>
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observación</label>
                <input className="form-input" placeholder="Ej: Pago cuota marzo..."
                  value={paymentForm.note}
                  onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))} />
              </div>

              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn--success">
                  <ReceiptText size={15} /> Registrar y ver boleta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {modal === 'receipt' && selectedClient && lastReceipt && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--receipt" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Pago registrado</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <ReceiptPreview />
              <div className="modal__actions">
                <button className="btn btn--ghost" onClick={closeModal}>Cerrar</button>
                <button className="btn btn--outline" onClick={handleDownloadReceipt}>
                  <Download size={15} /> Descargar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Sale Modal */}
      {modal === 'newSale' && selectedClient && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Venta a Cuenta Corriente</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleNewSale} className="modal__body">
              <div className="client-mini-card">
                <div className="mini-avatar">{selectedClient.name.charAt(0)}</div>
                <div>
                  <div className="mini-name">{selectedClient.name}</div>
                  <div className="mini-balance">
                    Disponible: <strong className={selectedClient.creditLimit - selectedClient.balance > 0 ? 'text-success' : 'text-danger'}>
                      {formatCurrency(Math.max(0, selectedClient.creditLimit - selectedClient.balance))}
                    </strong>
                  </div>
                </div>
              </div>

              {selectedClient.balance >= selectedClient.creditLimit && (
                <div className="alert alert--warning">
                  <AlertTriangle size={15} />
                  <span>Este cliente ya superó su límite de crédito ({formatCurrency(selectedClient.creditLimit)}).</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Importe de la venta *</label>
                <div className="amount-input-wrap">
                  <span className="amount-input-prefix">$</span>
                  <input
                    className="form-input form-input--amount"
                    type="number" min={0.01} step={0.01} required
                    placeholder="0"
                    autoFocus
                    value={saleForm.amount}
                    onChange={e => setSaleForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="form-input"
                  value={saleForm.description}
                  onChange={e => setSaleForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn--primary">
                  <ArrowUpRight size={15} /> Registrar venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Period Modal */}
      {modal === 'closePeriod' && selectedClient && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Cerrar período</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <div className="client-mini-card">
                <div className="mini-avatar">{selectedClient.name.charAt(0)}</div>
                <div>
                  <div className="mini-name">{selectedClient.name}</div>
                  <div className="mini-balance">
                    {selectedClient.movements.length} movimientos · Saldo: <strong className={selectedClient.balance > 0 ? 'text-danger' : 'text-success'}>{formatCurrency(selectedClient.balance)}</strong>
                  </div>
                </div>
              </div>
              {selectedClient.balance > 0 && (
                <div className="alert alert--warning">
                  <AlertTriangle size={15} />
                  <span>El cliente tiene saldo pendiente de <strong>{formatCurrency(selectedClient.balance)}</strong>. El período se archivará con ese saldo.</span>
                </div>
              )}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                Los movimientos actuales se moverán al historial. La cuenta quedará en cero movimientos activos.
              </p>
              <div className="close-period-options">
                <button className="close-period-btn" onClick={() => handleClosePeriod('month_end')}>
                  <Calendar size={18} />
                  <div>
                    <div className="close-period-btn__title">Fin de mes</div>
                    <div className="close-period-btn__desc">Cierre por finalización del período mensual</div>
                  </div>
                </button>
                <button className="close-period-btn" onClick={() => handleClosePeriod('manual')}>
                  <Archive size={18} />
                  <div>
                    <div className="close-period-btn__title">Cierre manual</div>
                    <div className="close-period-btn__desc">Archivar período por decisión propia</div>
                  </div>
                </button>
              </div>
              <div className="modal__actions">
                <button className="btn btn--ghost" onClick={closeModal}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {modal === 'deleteConfirm' && selectedClient && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Eliminar cliente</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <div className="alert alert--danger">
                <AlertTriangle size={16} />
                <div>
                  <strong>¿Eliminar a {selectedClient.name}?</strong>
                  <p>Se eliminará el cliente y todos sus movimientos. Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <div className="modal__actions">
                <button className="btn btn--ghost" onClick={closeModal}>Cancelar</button>
                <button className="btn btn--danger" onClick={handleDeleteClient}>
                  <Trash2 size={14} /> Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* ── Layout ── */
        .crm-layout {
          display: grid;
          grid-template-columns: 310px 1fr;
          height: 100vh;
          background: var(--bg-primary);
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .crm-sidebar {
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .crm-sidebar__header {
          padding: 20px;
          border-bottom: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sidebar-top {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .crm-search {
          position: relative;
          flex: 1;
        }

        .crm-search__icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .crm-search__input {
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 9px 10px 9px 32px;
          color: var(--text-primary);
          font-size: 0.82rem;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .crm-search__input:focus {
          border-color: var(--primary);
        }

        .btn-add {
          width: 36px;
          height: 36px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background var(--transition-fast);
        }

        .btn-add:hover { background: var(--primary-hover); }

        .filter-tabs {
          display: flex;
          gap: 4px;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 4px;
        }

        .filter-tab {
          flex: 1;
          padding: 8px 6px 6px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all var(--transition-fast);
          letter-spacing: 0.2px;
          text-transform: uppercase;
        }

        .filter-tab:hover {
          background: var(--bg-elevated);
          color: var(--text-secondary);
        }

        .filter-tab--active {
          background: var(--bg-card);
          color: var(--text-primary);
          box-shadow: 0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px var(--border-light);
        }

        .filter-tab__count {
          background: var(--bg-elevated);
          color: var(--text-muted);
          border-radius: 20px;
          padding: 1px 7px;
          font-size: 0.72rem;
          font-weight: 800;
          font-family: var(--font-mono);
          min-width: 22px;
          text-align: center;
          transition: all var(--transition-fast);
        }

        .filter-tab--active .filter-tab__count {
          background: var(--primary);
          color: white;
        }

        .filter-tab--debt-active .filter-tab__count {
          background: var(--warning);
          color: white;
        }

        .filter-tab--overdue-active .filter-tab__count {
          background: var(--danger);
          color: white;
        }

        .sidebar-total-debt {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: var(--text-muted);
          background: var(--danger-soft);
          border: 1px solid var(--danger-border);
          border-radius: var(--radius-sm);
          padding: 5px 10px;
        }

        .sidebar-total-debt strong { color: var(--danger); }

        .client-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }

        .client-list::-webkit-scrollbar { width: 4px; }
        .client-list::-webkit-scrollbar-track { background: transparent; }
        .client-list::-webkit-scrollbar-thumb { background: var(--surface); border-radius: 4px; }

        .client-list-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 20px;
          color: var(--text-muted);
          gap: 10px;
          font-size: 0.85rem;
        }

        .client-item {
          padding: 11px 12px 11px 14px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
          margin-bottom: 2px;
          border-left: 3px solid transparent;
        }

        .client-item:hover { background: var(--bg-elevated); }

        .client-item--active {
          background: var(--bg-tertiary);
          border-left-color: var(--primary);
          padding-left: 11px;
        }

        .client-item--overdue.client-item--active { border-left-color: var(--danger); }

        .client-item__avatar {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1rem;
          font-family: var(--font-heading);
          flex-shrink: 0;
        }

        .avatar--default { background: var(--primary-soft); color: var(--primary); }
        .avatar--danger { background: var(--danger-soft); color: var(--danger); }
        .avatar--muted { background: var(--bg-elevated); color: var(--text-muted); }

        .client-item__name {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .debt-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.73rem;
          font-weight: 600;
        }

        .debt-tag--ok { color: var(--success); }
        .debt-tag--debt { color: var(--warning); }
        .debt-tag--overdue { color: var(--danger); }

        /* ── Main ── */
        .crm-main {
          overflow-y: auto;
          background: var(--bg-primary);
        }

        .crm-main::-webkit-scrollbar { width: 5px; }
        .crm-main::-webkit-scrollbar-track { background: transparent; }
        .crm-main::-webkit-scrollbar-thumb { background: var(--surface); border-radius: 4px; }

        .client-details {
          padding: 32px 40px;
          max-width: 1200px;
          margin: 0 auto;
          background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
          min-height: 100%;
        }

        /* Profile Header */
        .client-profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 20px;
          flex-wrap: wrap;
          background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-tertiary) 100%);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-2xl);
          padding: 28px 32px;
          position: relative;
          overflow: hidden;
        }

        .client-profile-header::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 300px;
          height: 100%;
          background: radial-gradient(ellipse at right, var(--primary-glow) 0%, transparent 70%);
          opacity: 0.08;
          pointer-events: none;
        }

        .profile-hero {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.25rem;
          font-weight: 900;
          font-family: var(--font-heading);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 0 4px var(--bg-card), 0 0 0 6px var(--border-light), inset 0 1px 0 rgba(255,255,255,0.15);
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }

        .profile-avatar::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%);
          border-radius: 24px;
        }

        .profile-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .profile-title-row h1 {
          font-family: var(--font-heading);
          font-size: 1.7rem;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .status-badge {
          padding: 3px 9px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge--active { background: var(--success-soft); color: var(--success); border: 1px solid var(--success-border); }
        .status-badge--overdue { background: var(--danger-soft); color: var(--danger); border: 1px solid var(--danger-border); }
        .status-badge--blocked { background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border-light); }

        .profile-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
        }

        .profile-meta span {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--text-tertiary);
          font-size: 0.82rem;
          background: var(--bg-secondary);
          padding: 3px 9px;
          border-radius: var(--radius-full);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .header-actions__sep {
          width: 1px;
          height: 28px;
          background: var(--border-light);
          margin: 0 2px;
        }

        /* Summary Cards */
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .summary-card {
          background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-tertiary) 100%);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          overflow: hidden;
          transition: all var(--transition-base);
        }

        .summary-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .summary-card--main {
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(220, 38, 38, 0.08) 100%);
          border-color: var(--primary);
          border-top: 3px solid var(--primary);
          box-shadow: 0 4px 20px rgba(220, 38, 38, 0.15);
        }

        .summary-card__icon {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--surface) 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          flex-shrink: 0;
          border: 1px solid var(--border-light);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          position: relative;
          overflow: hidden;
        }

        .summary-card__icon::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 50%);
        }

        .summary-card__label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .summary-card__value {
          font-size: 1.6rem;
          font-weight: 900;
          font-family: var(--font-mono);
          color: var(--text-primary);
          letter-spacing: -1px;
        }

        /* Tabs */
        .tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--border-light);
          margin-bottom: 24px;
          background: var(--bg-secondary);
          padding: 6px;
          border-radius: var(--radius-xl);
        }

        .tab {
          padding: 12px 20px;
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: var(--radius-lg);
          transition: all var(--transition-base);
        }

        .tab:hover { 
          color: var(--text-secondary); 
          background: var(--bg-tertiary);
        }

        .tab--active {
          color: white;
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .tab__count {
          background: var(--surface);
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .tab--active .tab__count {
          background: rgba(255,255,255,0.2);
          color: white;
        }

        /* Ledger */
        .ledger-section {
          background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-tertiary) 100%);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl);
          padding: 28px;
          position: relative;
        }

        .ledger-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--primary-glow), transparent);
        }

        .ledger-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-light);
        }

        .ledger-header h3 {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ledger-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px;
          color: var(--text-muted);
          gap: 12px;
        }

        .ledger {
          display: flex;
          flex-direction: column;
        }

        .ledger-thead {
          display: grid;
          grid-template-columns: 110px 1fr 130px 120px 120px 120px;
          padding: 10px 14px;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .ledger-row {
          display: grid;
          grid-template-columns: 110px 1fr 130px 120px 120px 120px;
          padding: 11px 14px 11px 12px;
          border-bottom: 1px solid var(--border-light);
          border-left: 3px solid transparent;
          align-items: center;
          transition: background var(--transition-fast);
          font-size: 0.875rem;
        }

        .ledger-row:not(.ledger-row--payment) { border-left-color: rgba(220, 38, 38, 0.35); }
        .ledger-row:hover { background: var(--bg-elevated); }
        .ledger-row--payment {
          background: rgba(34, 197, 94, 0.03);
          border-left-color: rgba(34, 197, 94, 0.5);
        }

        .ledger-cell { display: flex; align-items: center; }

        .ledger-date {
          flex-direction: column;
          align-items: flex-start;
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 0.82rem;
        }

        .ledger-time {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 400;
        }

        .ledger-desc {
          gap: 8px;
          color: var(--text-primary);
          font-weight: 500;
          min-width: 0;
        }

        .ledger-type-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dot--sale { background: var(--danger); }
        .dot--payment { background: var(--success); }

        .ticket-badge {
          font-size: 0.7rem;
          background: var(--primary-soft);
          color: var(--primary);
          padding: 1px 6px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .method-tag {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          background: var(--bg-elevated);
          padding: 2px 8px;
          border-radius: 6px;
        }

        .ledger-muted { color: var(--text-muted); font-size: 0.85rem; }
        .ledger-method, .ledger-debit, .ledger-credit, .ledger-balance { justify-content: flex-end; }

        .amount-debit {
          color: var(--danger);
          font-weight: 800;
          font-family: var(--font-mono);
        }

        .amount-credit {
          color: var(--success);
          font-weight: 800;
          font-family: var(--font-mono);
        }

        .ledger-balance {
          font-weight: 900;
          font-family: var(--font-mono);
          font-size: 0.95rem;
        }

        /* Info Tab */
        .info-section { display: flex; flex-direction: column; gap: 20px; }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .info-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl);
          padding: 24px;
        }

        .info-card h4 {
          font-family: var(--font-heading);
          font-size: 0.9rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .info-rows { display: flex; flex-direction: column; gap: 0; }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-light);
          font-size: 0.88rem;
        }

        .info-row:last-child { border-bottom: none; }
        .info-row span { color: var(--text-tertiary); }
        .info-row strong { color: var(--text-primary); font-weight: 600; }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-item {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: 14px;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 900;
          font-family: var(--font-mono);
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.4px;
          font-weight: 600;
        }

        .info-notes {
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          display: flex;
          align-items: flex-start;
          gap: 8px;
          border-left: 3px solid var(--secondary);
        }

        .info-edit-btn { align-self: flex-start; }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 60vh;
          gap: 14px;
          color: var(--text-muted);
          text-align: center;
          padding: 40px;
        }

        .empty-icon {
          width: 100px;
          height: 100px;
          background: var(--bg-tertiary);
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .empty-state h2 {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .empty-state p { font-size: 0.9rem; max-width: 320px; }

        /* ── Buttons ── */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          border: none;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .btn--primary { background: var(--primary); color: white; }
        .btn--primary:hover { background: var(--primary-hover); }

        .btn--outline {
          background: transparent;
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
        }
        .btn--outline:hover { border-color: var(--primary); color: var(--primary); }

        .btn--ghost {
          background: transparent;
          color: var(--text-secondary);
        }
        .btn--ghost:hover { background: var(--bg-elevated); }

        .btn--danger-ghost { color: var(--danger); }
        .btn--danger-ghost:hover { background: var(--danger-soft); }

        .btn--danger { background: var(--danger); color: white; }
        .btn--danger:hover { background: #dc2626; }

        .btn--success { background: var(--success); color: white; }
        .btn--success:hover { background: #16a34a; }

        .btn--sm { padding: 7px 12px; font-size: 0.82rem; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .modal {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 480px;
          box-shadow: var(--shadow-xl);
          overflow: hidden;
        }

        .modal--wide { max-width: 620px; }
        .modal--sm { max-width: 420px; }
        .modal--receipt { max-width: 400px; }

        .modal__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-light);
        }

        .modal__header h3 {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          font-weight: 800;
        }

        .modal__close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color var(--transition-fast);
        }

        .modal__close:hover { color: var(--text-primary); }

        .modal__body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .modal__actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 4px;
        }

        /* Form */
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group { display: flex; flex-direction: column; gap: 6px; }

        .form-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .form-input {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          color: var(--text-primary);
          font-size: 0.9rem;
          outline: none;
          transition: border-color var(--transition-fast);
          width: 100%;
          font-family: inherit;
        }

        .form-input:focus { border-color: var(--primary); }

        .form-textarea {
          resize: vertical;
          min-height: 72px;
        }

        .form-select {
          appearance: none;
          cursor: pointer;
        }

        .amount-input-wrap {
          position: relative;
        }

        .amount-input-prefix {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-muted);
          pointer-events: none;
        }

        .form-input--amount {
          padding-left: 32px;
          font-size: 1.8rem;
          font-weight: 900;
          font-family: var(--font-mono);
          color: var(--success);
          letter-spacing: -1px;
        }

        /* Payment method options */
        .method-options {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .method-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 10px 6px;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-tertiary);
          transition: all var(--transition-fast);
        }

        .method-option input { display: none; }

        .method-option:hover {
          border-color: var(--border);
          color: var(--text-secondary);
        }

        .method-option--active {
          border-color: var(--primary);
          background: var(--primary-soft);
          color: var(--primary);
        }

        .method-option__icon { font-size: 1.4rem; }

        /* Client mini card */
        .client-mini-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .mini-avatar {
          width: 40px;
          height: 40px;
          background: var(--primary);
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .mini-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .mini-balance {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        /* Alert */
        .alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
        }

        .alert--warning {
          background: var(--warning-soft);
          border: 1px solid var(--warning-border);
          color: var(--warning);
        }

        .alert--danger {
          background: var(--danger-soft);
          border: 1px solid var(--danger-border);
          color: var(--danger);
        }

        .alert p {
          font-size: 0.8rem;
          color: var(--text-tertiary);
          margin-top: 3px;
        }

        /* Receipt card */
        .receipt-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl);
          overflow: hidden;
          font-family: var(--font-mono);
        }

        .receipt-header {
          background: var(--primary);
          padding: 18px 20px 16px;
          text-align: center;
          color: white;
        }

        .receipt-logo {
          font-size: 1rem;
          font-weight: 900;
          font-family: var(--font-heading);
          margin-bottom: 4px;
        }

        .receipt-title {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 1px;
          opacity: 0.85;
        }

        .receipt-meta {
          font-size: 0.72rem;
          opacity: 0.7;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .receipt-divider {
          height: 1px;
          background: var(--border-light);
          margin: 0 16px;
        }

        .receipt-divider--dark {
          background: var(--border);
          height: 2px;
        }

        .receipt-section {
          padding: 14px 20px;
        }

        .receipt-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
        }

        .receipt-client-name {
          font-size: 1rem;
          font-weight: 800;
          color: var(--text-primary);
          font-family: var(--font-heading);
        }

        .receipt-client-meta {
          font-size: 0.78rem;
          color: var(--text-tertiary);
          margin-top: 3px;
        }

        .receipt-concept {
          font-size: 0.9rem;
          color: var(--text-primary);
          font-weight: 600;
        }

        .receipt-method {
          font-size: 0.78rem;
          color: var(--text-tertiary);
          margin-top: 4px;
        }

        .receipt-amounts {
          padding: 14px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .receipt-amount-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.88rem;
          color: var(--text-secondary);
        }

        .receipt-amount-row--paid {
          color: var(--success);
          font-weight: 700;
        }

        .receipt-amount-row--total {
          font-size: 1.1rem;
          font-weight: 900;
          padding-top: 8px;
        }

        .receipt-footer {
          text-align: center;
          padding: 10px;
          font-size: 0.68rem;
          color: var(--text-muted);
          background: var(--bg-secondary);
        }

        /* Utilities */
        .text-right { text-align: right; }
        .text-danger { color: var(--danger) !important; }
        .text-success { color: var(--success) !important; }
        .text-muted { color: var(--text-muted); }

        /* ── History tab ── */
        .history-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .period-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl);
          overflow: hidden;
          transition: border-color var(--transition-fast);
        }

        .period-card:hover { border-color: var(--border); }

        .period-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          cursor: pointer;
          gap: 16px;
        }

        .period-card__left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .period-card__icon {
          width: 38px;
          height: 38px;
          background: var(--bg-secondary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          flex-shrink: 0;
          border: 1px solid var(--border-light);
        }

        .period-card__label {
          font-weight: 800;
          font-size: 1rem;
          color: var(--text-primary);
          font-family: var(--font-heading);
        }

        .period-card__dates {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
          font-family: var(--font-mono);
        }

        .period-card__right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .period-badge {
          padding: 3px 10px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .period-badge--settled { background: var(--success-soft); color: var(--success); border: 1px solid var(--success-border); }
        .period-badge--month { background: var(--primary-soft); color: var(--primary); border: 1px solid var(--primary-glow); }
        .period-badge--manual { background: var(--bg-elevated); color: var(--text-tertiary); border: 1px solid var(--border-light); }

        .period-card__summary {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .period-movements {
          border-top: 1px solid var(--border-light);
          background: var(--bg-secondary);
        }

        .period-movement {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 22px;
          border-bottom: 1px solid var(--border-light);
          border-left: 3px solid rgba(220, 38, 38, 0.35);
          font-size: 0.85rem;
        }

        .period-movement--payment {
          border-left-color: rgba(34, 197, 94, 0.5);
          background: rgba(34, 197, 94, 0.02);
        }

        .period-movement:last-of-type { border-bottom: none; }

        .period-movement__info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .period-movement__desc {
          color: var(--text-primary);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .period-movement__date {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .period-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 22px;
          font-size: 0.8rem;
          color: var(--text-muted);
          background: var(--bg-elevated);
          border-top: 1px solid var(--border-light);
        }

        /* Close period modal */
        .close-period-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .close-period-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
          color: var(--text-primary);
        }

        .close-period-btn:hover {
          border-color: var(--primary);
          background: var(--primary-soft);
        }

        .close-period-btn__title {
          font-weight: 700;
          font-size: 0.9rem;
        }

        .close-period-btn__desc {
          font-size: 0.77rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* Search clear */
        .crm-search__clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          border-radius: 4px;
        }
        .crm-search__clear:hover { color: var(--text-secondary); }
        .crm-search__input { padding-right: 28px; }

        /* Client item upgrades */
        .client-item__row1 {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 6px;
        }
        .client-item__date {
          font-size: 0.68rem;
          color: var(--text-muted);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .client-item__sub {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 2px;
        }
        .client-item__phone {
          font-size: 0.71rem;
          color: var(--text-muted);
        }

        /* Credit bar */
        .credit-bar {
          height: 6px;
          background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--surface) 100%);
          border-radius: var(--radius-full);
          margin-top: 10px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
        }
        .credit-bar__fill {
          height: 100%;
          background: linear-gradient(90deg, var(--success), #4ADE80);
          border-radius: var(--radius-full);
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
        }
        .credit-bar__fill--over { 
          background: linear-gradient(90deg, var(--danger), #F87171);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
        }
        .credit-bar__label {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 5px;
          font-weight: 600;
        }

        /* Movement filters */
        .movement-filters {
          display: flex;
          gap: 2px;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          padding: 2px;
        }
        .mvt-filter {
          padding: 4px 10px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .mvt-filter:hover { color: var(--text-secondary); }
        .mvt-filter--active {
          background: var(--bg-card);
          color: var(--text-primary);
        }

        /* Ledger totals */
        .ledger-totals {
          display: flex;
          gap: 24px;
          padding: 14px 16px;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          margin-top: 12px;
          font-size: 0.82rem;
          color: var(--text-tertiary);
          flex-wrap: wrap;
        }
        .ledger-totals strong { font-family: var(--font-mono); }

        /* Quick amounts */
        .quick-amounts {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .quick-amount-btn {
          padding: 5px 12px;
          border: 1px solid var(--border-light);
          background: var(--bg-card);
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .quick-amount-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
          background: var(--primary-soft);
        }

        @media (max-width: 1200px) {
          .summary-cards { grid-template-columns: repeat(2, 1fr); }
          .info-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 900px) {
          .crm-layout { grid-template-columns: 260px 1fr; }
          .client-details { padding: 24px; }
        }

        /* Light mode */
        [data-theme="light"] .crm-sidebar {
          background: linear-gradient(180deg, #FFFFFF 0%, #F8F8F9 100%);
        }

        [data-theme="light"] .crm-sidebar__header {
          background: linear-gradient(180deg, #F1F1F3 0%, #F8F8F9 100%);
        }

        [data-theme="light"] .crm-search__input {
          background: linear-gradient(135deg, #FFFFFF 0%, #F8F8F9 100%);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
        }

        [data-theme="light"] .crm-search__input:focus {
          border-color: #DC2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
        }

        [data-theme="light"] .btn-add {
          background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
        }

        [data-theme="light"] .client-item {
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid #E4E4E7;
        }

        [data-theme="light"] .client-item:hover {
          background: #FFFFFF;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        [data-theme="light"] .client-item--active {
          background: linear-gradient(135deg, #FFFFFF 0%, #F8F8F9 100%);
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.15);
        }

        [data-theme="light"] .empty-state {
          background: radial-gradient(circle at center top, #FFFFFF 0%, #F8F8F9 60%);
        }

        [data-theme="light"] .empty-state__icon {
          background: linear-gradient(135deg, #FFFFFF 0%, #F1F1F3 100%);
          box-shadow: var(--shadow-xl), 0 8px 32px rgba(220, 38, 38, 0.1);
          border: 1px solid #E4E4E7;
        }

        [data-theme="light"] .client-details {
          background: radial-gradient(circle at 50% -5%, #FFFFFF 0%, #F8F8F9 70%);
        }

        [data-theme="light"] .client-profile-header {
          background: linear-gradient(135deg, #FFFFFF 0%, #F1F1F3 100%);
          border: 1px solid #E4E4E7;
        }

        [data-theme="light"] .summary-card {
          background: linear-gradient(135deg, #FFFFFF 0%, #F8F8F9 100%);
          border: 1px solid #E4E4E7;
        }

        [data-theme="light"] .tabs {
          background: #F1F1F3;
        }

        [data-theme="light"] .ledger-section {
          background: linear-gradient(135deg, #FFFFFF 0%, #F8F8F9 100%);
          border: 1px solid #E4E4E7;
        }
      `}</style>
    </div>
  );
}
