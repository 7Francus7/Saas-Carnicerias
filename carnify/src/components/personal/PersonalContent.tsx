"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  UserCog, Search, UserPlus, Phone, Hash,
  Trash2, Edit3, X,
  Briefcase, Calendar, DollarSign, Clock,
  AlertTriangle, Users, StickyNote,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { useStaffStore, StaffProfile, StaffFormData, ROLE_LABELS, STATUS_LABELS } from "@/stores/useStaffStore";
import {
  getStaff,
  createStaff,
  updateStaff as dbUpdateStaff,
  deleteStaff as dbDeleteStaff,
} from "@/actions/staff";

type ModalType = 'none' | 'addStaff' | 'editStaff' | 'deleteConfirm';
type FilterType = 'all' | 'active' | 'inactive';

const EMPTY_FORM: StaffFormData = {
  name: '', dni: '', phone: '', role: 'carnicero',
  address: '', email: '', notes: '', salary: 0,
  schedule: '', status: 'active',
};

const ROLE_COLORS: Record<StaffProfile['role'], string> = {
  encargado: '#8B5CF6',
  carnicero: '#EF4444',
  cajero: '#3B82F6',
  ayudante: '#F59E0B',
  limpieza: '#10B981',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbStaff(s: any): StaffProfile {
  return {
    id: s.id,
    name: s.name,
    dni: s.dni,
    phone: s.phone,
    role: s.role as StaffProfile['role'],
    address: s.address,
    email: s.email,
    notes: s.notes,
    salary: s.salary,
    schedule: s.schedule,
    status: s.status as StaffProfile['status'],
    hireDate: new Date(s.hireDate).toISOString(),
    lastActivity: new Date(s.lastActivity).toISOString(),
    createdAt: new Date(s.createdAt).toISOString(),
  };
}

export default function PersonalContent() {
  const { staff, selectedStaffId, setSelectedStaff, hydrate } = useStaffStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [modal, setModal] = useState<ModalType>('none');
  const [staffForm, setStaffForm] = useState<StaffFormData>(EMPTY_FORM);

  const loadStaff = useCallback(async () => {
    const data = await getStaff();
    hydrate(data.map(mapDbStaff));
  }, [hydrate]);

  useEffect(() => { void loadStaff(); }, [loadStaff]);
  const [now] = useState(() => Date.now());

  const selectedStaff = useMemo(
    () => staff.find(p => p.id === selectedStaffId) ?? null,
    [staff, selectedStaffId]
  );

  const filteredStaff = useMemo(() => {
    let list = staff;
    if (filter === 'active') list = list.filter(p => p.status === 'active');
    if (filter === 'inactive') list = list.filter(p => p.status !== 'active');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.dni.includes(q) ||
        p.phone.includes(q) ||
        ROLE_LABELS[p.role].toLowerCase().includes(q)
      );
    }
    return list;
  }, [staff, filter, search]);

  const sidebarStats = useMemo(() => ({
    total: staff.length,
    active: staff.filter(p => p.status === 'active').length,
    carniceros: staff.filter(p => p.role === 'carnicero').length,
    totalSalaries: staff.reduce((s, p) => s + p.salary, 0),
  }), [staff]);

  function openAddStaff() {
    setStaffForm(EMPTY_FORM);
    setModal('addStaff');
  }

  function openEditStaff() {
    if (!selectedStaff) return;
    setStaffForm({
      name: selectedStaff.name,
      dni: selectedStaff.dni,
      phone: selectedStaff.phone,
      role: selectedStaff.role,
      address: selectedStaff.address,
      email: selectedStaff.email,
      notes: selectedStaff.notes,
      salary: selectedStaff.salary,
      schedule: selectedStaff.schedule,
      status: selectedStaff.status,
    });
    setModal('editStaff');
  }

  async function handleSaveStaff(e: React.FormEvent) {
    e.preventDefault();
    if (modal === 'addStaff') {
      await createStaff({ ...staffForm, hireDate: new Date() });
    } else {
      if (selectedStaff) await dbUpdateStaff(selectedStaff.id, staffForm);
    }
    await loadStaff();
    setModal('none');
  }

  async function handleDeleteStaff() {
    if (!selectedStaff) return;
    await dbDeleteStaff(selectedStaff.id);
    setSelectedStaff(null);
    await loadStaff();
    setModal('none');
  }

  function closeModal() {
    setModal('none');
  }

  function relativeDate(dateStr: string): string {
    const days = Math.floor((now - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`;
    return `Hace ${Math.floor(days / 30)} meses`;
  }

  const renderFilterTab = (value: FilterType, label: string, count: number) => (
    <button
      className={`filter-tab ${filter === value ? 'filter-tab--active' : ''}`}
      onClick={() => setFilter(value)}
    >
      {label}
      <span className="filter-tab__count">{count}</span>
    </button>
  );

  return (
    <div className="crm-layout">
      <div className="crm-sidebar">
        <div className="crm-sidebar__header">
          <div className="sidebar-top">
            <div className="crm-search">
              <Search size={15} className="crm-search__icon" />
              <input
                type="text"
                placeholder="Buscar por nombre, DNI..."
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
            <button className="btn-add" onClick={openAddStaff} title="Nuevo empleado">
              <UserPlus size={17} />
            </button>
          </div>

          <div className="filter-tabs">
            {renderFilterTab('all', 'Todos', sidebarStats.total)}
            {renderFilterTab('active', 'Activos', sidebarStats.active)}
            {renderFilterTab('inactive', 'Inactivos', sidebarStats.total - sidebarStats.active)}
          </div>
        </div>

        <div className="client-list">
          {filteredStaff.length === 0 ? (
            <div className="client-list-empty animate-in">
              <Users size={32} />
              <p>Sin resultados</p>
            </div>
          ) : (
            filteredStaff.map(person => (
              <div
                key={person.id}
                className={`client-item animate-in ${selectedStaffId === person.id ? 'client-item--active' : ''}`}
                onClick={() => setSelectedStaff(person.id)}
              >
                <div
                  className="client-item__avatar"
                  style={{ background: ROLE_COLORS[person.role] }}
                >
                  {person.name.charAt(0)}
                </div>
                <div className="client-item__info">
                  <div className="client-item__row1">
                    <div className="client-item__name">{person.name}</div>
                    <div className="client-item__date">{relativeDate(person.lastActivity)}</div>
                  </div>
                  <div className="client-item__sub">
                    <span
                      className="role-tag"
                      style={{ background: ROLE_COLORS[person.role] + '22', color: ROLE_COLORS[person.role] }}
                    >
                      {ROLE_LABELS[person.role]}
                    </span>
                    {person.phone && <span className="client-item__phone">{person.phone}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="crm-sidebar__header">
          <div className="sidebar-total-debt">
            <span>
              <Briefcase size={18} />
              Total nóminas:
              <strong>{formatCurrency(sidebarStats.totalSalaries)}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="crm-main animate-in">
        {!selectedStaff ? (
          <div className="empty-state">
            <div className="empty-state__icon"><UserCog size={56} /></div>
            <h2>Gestioná Personal</h2>
            <p>Controlá empleados, horarios, nóminas y datos laborales.</p>
            <button className="btn btn--outline" onClick={openAddStaff}>
              <UserPlus size={16} /> Nuevo Empleado
            </button>
          </div>
        ) : (
          <div className="client-details animate-in">
            <div className="client-profile-header">
              <div className="profile-hero">
                <div className="profile-avatar" style={{ background: ROLE_COLORS[selectedStaff.role] }}>
                  {selectedStaff.name.charAt(0)}
                </div>
                <div className="profile-info">
                  <div className="profile-title-row">
                    <h1>{selectedStaff.name}</h1>
                    <span className={`status-badge status-badge--${selectedStaff.status}`}>
                      {STATUS_LABELS[selectedStaff.status]}
                    </span>
                  </div>
                  <div className="profile-meta">
                    <span className="role-tag-premium" style={{ border: `1px solid ${ROLE_COLORS[selectedStaff.role]}`, color: ROLE_COLORS[selectedStaff.role] }}>
                      {ROLE_LABELS[selectedStaff.role]}
                    </span>
                    {selectedStaff.dni && <span><Hash size={13} /> {selectedStaff.dni}</span>}
                    {selectedStaff.phone && <span><Phone size={13} /> {selectedStaff.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="header-actions">
                <button className="btn btn--primary btn--sm" onClick={openEditStaff} title="Editar empleado">
                  <Edit3 size={15} /> Editar Perfil
                </button>
                <button className="btn btn--danger-ghost btn--sm" onClick={() => setModal('deleteConfirm')} title="Eliminar empleado">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="summary-cards">
              <div className="summary-card summary-card--main">
                <div className="summary-card__icon"><DollarSign size={22} /></div>
                <div>
                  <div className="summary-card__label">Sueldo mensual</div>
                  <div className="summary-card__value">{formatCurrency(selectedStaff.salary)}</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-card__icon"><Briefcase size={20} /></div>
                <div>
                  <div className="summary-card__label">Fecha de ingreso</div>
                  <div className="summary-card__value">{new Date(selectedStaff.hireDate).toLocaleDateString('es-AR')}</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-card__icon"><Clock size={20} /></div>
                <div>
                  <div className="summary-card__label">Horario</div>
                  <div className="summary-card__value" style={{ fontSize: '0.9rem' }}>{selectedStaff.schedule || '—'}</div>
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-card__icon"><Calendar size={20} /></div>
                <div>
                  <div className="summary-card__label">Antigüedad</div>
                  <div className="summary-card__value">
                    {Math.floor((now - new Date(selectedStaff.hireDate).getTime()) / (365.25 * 86400000))} años
                  </div>
                </div>
              </div>
            </div>

            <div className="info-section" style={{ marginTop: 24 }}>
              <div className="info-grid">
                <div className="info-card">
                  <h4><Briefcase size={15} /> Datos del Empleado</h4>
                  <div className="info-rows">
                    <div className="info-row"><span>Nombre</span><strong>{selectedStaff.name}</strong></div>
                    <div className="info-row"><span>DNI</span><strong>{selectedStaff.dni || '—'}</strong></div>
                    <div className="info-row"><span>Teléfono</span><strong>{selectedStaff.phone || '—'}</strong></div>
                    <div className="info-row"><span>Email</span><strong>{selectedStaff.email || '—'}</strong></div>
                    <div className="info-row"><span>Dirección</span><strong>{selectedStaff.address || '—'}</strong></div>
                    <div className="info-row"><span>Cargo</span><strong>{ROLE_LABELS[selectedStaff.role]}</strong></div>
                    <div className="info-row"><span>Estado</span>
                      <strong className={selectedStaff.status === 'active' ? 'text-success' : selectedStaff.status === 'suspended' ? 'text-danger' : ''}>
                        {STATUS_LABELS[selectedStaff.status]}
                      </strong>
                    </div>
                    <div className="info-row"><span>Fecha de ingreso</span><strong>{new Date(selectedStaff.hireDate).toLocaleDateString('es-AR')}</strong></div>
                    <div className="info-row"><span>Última actividad</span><strong>{relativeDate(selectedStaff.lastActivity)}</strong></div>
                  </div>
                </div>

                <div className="info-card">
                  <h4><DollarSign size={15} /> Información Laboral</h4>
                  <div className="info-rows">
                    <div className="info-row"><span>Sueldo</span><strong>{formatCurrency(selectedStaff.salary)}</strong></div>
                    <div className="info-row"><span>Horario</span><strong>{selectedStaff.schedule || '—'}</strong></div>
                  </div>

                  {selectedStaff.notes && (
                    <div className="info-notes" style={{ marginTop: 16 }}>
                      <StickyNote size={13} />
                      <span>{selectedStaff.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="info-actions-bar">
                <button className="btn btn--outline btn--sm info-edit-btn" onClick={openEditStaff}>
                  <Edit3 size={14} /> Editar información detallada
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {modal === 'addStaff' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal emp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header emp-modal__heading">
              <div className="emp-modal__icon"><UserPlus size={20} /></div>
              <div>
                <h3 style={{margin: 0}}>Nuevo Empleado</h3>
                <span className="emp-modal__subtitle">Complete los datos del nuevo empleado</span>
              </div>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveStaff} className="emp-modal__body">
              <div className="section-divider">
                <span className="section-divider__label">Datos Personales</span>
                <div className="section-divider__line"></div>
              </div>
              <div className="emp-form-grid">
                <div className="form-group">
                  <label className="field-label">Nombre completo<span className="field-label__req">*</span></label>
                  <input className="form-input" required placeholder="Ej: Juan Pérez"
                    value={staffForm.name}
                    onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="field-label">DNI<span className="field-label__req">*</span></label>
                  <input className="form-input" required placeholder="20-12345678-9"
                    value={staffForm.dni}
                    onChange={e => setStaffForm(f => ({ ...f, dni: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="field-label">Teléfono</label>
                  <input className="form-input" placeholder="11-4567-8901"
                    value={staffForm.phone}
                    onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="field-label">Email</label>
                  <input className="form-input" type="email" placeholder="email@ejemplo.com"
                    value={staffForm.email}
                    onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-group emp-form-col-2">
                <label className="field-label">Dirección</label>
                <input className="form-input" placeholder="Av. Corrientes 1234, CABA"
                  value={staffForm.address}
                  onChange={e => setStaffForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              
              <div className="section-divider">
                <span className="section-divider__label">Datos Laborales</span>
                <div className="section-divider__line"></div>
              </div>
              <div className="emp-form-grid">
                <div className="form-group">
                  <label className="field-label">Cargo</label>
                  <select className="form-input form-select"
                    value={staffForm.role}
                    onChange={e => setStaffForm(f => ({ ...f, role: e.target.value as StaffFormData['role'] }))}>
                    <option value="encargado">Encargado</option>
                    <option value="carnicero">Carnicero</option>
                    <option value="cajero">Cajero</option>
                    <option value="ayudante">Ayudante</option>
                    <option value="limpieza">Limpieza</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="field-label">Sueldo ($)</label>
                  <input className="form-input" type="number" min={0} placeholder="0"
                    value={staffForm.salary || ''}
                    onChange={e => setStaffForm(f => ({ ...f, salary: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="form-group">
                  <label className="field-label">Horario</label>
                  <input className="form-input" placeholder="Ej: Lun-Sáb 08:00-16:00"
                    value={staffForm.schedule}
                    onChange={e => setStaffForm(f => ({ ...f, schedule: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="field-label">Estado</label>
                  <select className="form-input form-select"
                    value={staffForm.status}
                    onChange={e => setStaffForm(f => ({ ...f, status: e.target.value as StaffFormData['status'] }))}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="vacations">Vacaciones</option>
                    <option value="suspended">Suspendido</option>
                  </select>
                </div>
              </div>
              <div className="form-group emp-form-col-2">
                <label className="field-label">Notas</label>
                <textarea className="form-input form-textarea" placeholder="Observaciones..." rows={2}
                  value={staffForm.notes}
                  onChange={e => setStaffForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="emp-modal__footer">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn--primary">
                  Crear empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'editStaff' && selectedStaff && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal emp-modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header emp-modal__heading">
              <div className="emp-modal__icon"><UserCog size={20} /></div>
              <div>
                <h3 style={{margin: 0}}>Editar Empleado</h3>
                <span className="emp-modal__subtitle">Actualice los datos del empleado</span>
              </div>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveStaff} className="emp-modal__body">
              <div className="section-divider">
                <span className="section-divider__label">Datos Personales</span>
                <div className="section-divider__line"></div>
              </div>
              <div className="emp-form-grid">
                <div className="form-group">
                  <label className="field-label">Nombre completo<span className="field-label__req">*</span></label>
                  <input className="form-input" required placeholder="Ej: Juan Pérez"
                    value={staffForm.name}
                    onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="field-label">DNI<span className="field-label__req">*</span></label>
                  <input className="form-input" required placeholder="20-12345678-9"
                    value={staffForm.dni}
                    onChange={e => setStaffForm(f => ({ ...f, dni: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="field-label">Teléfono</label>
                  <input className="form-input" placeholder="11-4567-8901"
                    value={staffForm.phone}
                    onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="field-label">Email</label>
                  <input className="form-input" type="email" placeholder="email@ejemplo.com"
                    value={staffForm.email}
                    onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-group emp-form-col-2">
                <label className="field-label">Dirección</label>
                <input className="form-input" placeholder="Av. Corrientes 1234, CABA"
                  value={staffForm.address}
                  onChange={e => setStaffForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              
              <div className="section-divider">
                <span className="section-divider__label">Datos Laborales</span>
                <div className="section-divider__line"></div>
              </div>
              <div className="emp-form-grid">
                <div className="form-group">
                  <label className="field-label">Cargo</label>
                  <select className="form-input form-select"
                    value={staffForm.role}
                    onChange={e => setStaffForm(f => ({ ...f, role: e.target.value as StaffFormData['role'] }))}>
                    <option value="encargado">Encargado</option>
                    <option value="carnicero">Carnicero</option>
                    <option value="cajero">Cajero</option>
                    <option value="ayudante">Ayudante</option>
                    <option value="limpieza">Limpieza</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="field-label">Sueldo ($)</label>
                  <input className="form-input" type="number" min={0} placeholder="0"
                    value={staffForm.salary || ''}
                    onChange={e => setStaffForm(f => ({ ...f, salary: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="form-group">
                  <label className="field-label">Horario</label>
                  <input className="form-input" placeholder="Ej: Lun-Sáb 08:00-16:00"
                    value={staffForm.schedule}
                    onChange={e => setStaffForm(f => ({ ...f, schedule: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="field-label">Estado</label>
                  <select className="form-input form-select"
                    value={staffForm.status}
                    onChange={e => setStaffForm(f => ({ ...f, status: e.target.value as StaffFormData['status'] }))}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="vacations">Vacaciones</option>
                    <option value="suspended">Suspendido</option>
                  </select>
                </div>
              </div>
              <div className="form-group emp-form-col-2">
                <label className="field-label">Notas</label>
                <textarea className="form-input form-textarea" placeholder="Observaciones..." rows={2}
                  value={staffForm.notes}
                  onChange={e => setStaffForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="emp-modal__footer">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn--primary">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'deleteConfirm' && selectedStaff && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--sm" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Eliminar empleado</h3>
              <button className="modal__close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal__body">
              <div className="alert alert--danger">
                <AlertTriangle size={16} />
                <div className="alert__text">
                  <strong>¿Eliminar a {selectedStaff.name}?</strong>
                  <p>Se eliminará el registro del empleado. Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <div className="modal__actions">
                <button className="btn btn--ghost" onClick={closeModal}>Cancelar</button>
                <button className="btn btn--danger" onClick={handleDeleteStaff}>
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

<style jsx>{`
  .crm-sidebar {
    width: 360px;
    background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
    border-right: 1px solid var(--border-light);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
  }

  .crm-sidebar::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(180deg, rgba(139, 92, 246, 0.2), transparent);
  }

  [data-theme="light"] .crm-sidebar {
    background: linear-gradient(180deg, #FFFFFF 0%, #F8F8F9 100%);
  }

  [data-theme="light"] .crm-sidebar::before {
    background: linear-gradient(180deg, rgba(139, 92, 246, 0.4), transparent);
  }

  .crm-sidebar__header {
    padding: 20px;
    border-bottom: 1px solid var(--border-light);
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
  }

  [data-theme="light"] .crm-sidebar__header {
    background: linear-gradient(180deg, #F1F1F3 0%, #F8F8F9 100%);
  }

  .sidebar-top {
    display: flex;
    gap: 12px;
  }

  .crm-main {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    background: radial-gradient(circle at 50% -20%, #1c1c1f 0%, var(--bg-primary) 80%);
    position: relative;
  }

  .crm-main::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.15), transparent);
    opacity: 0.5;
  }

  [data-theme="light"] .crm-main {
    background: radial-gradient(circle at 50% -10%, #F1F1F3 0%, #F8F8F9 70%);
  }

  [data-theme="light"] .crm-main::before {
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent);
    opacity: 1;
  }

  .crm-main::-webkit-scrollbar { width: 5px; }
  .crm-main::-webkit-scrollbar-track { background: transparent; }
  .crm-main::-webkit-scrollbar-thumb { background: var(--surface); border-radius: 4px; }

  .client-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .client-list-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: var(--text-muted);
    gap: 12px;
  }

  .sidebar-stats {
    padding: 16px 20px;
    border-top: 1px solid var(--border-light);
    background: linear-gradient(180deg, var(--surface) 0%, var(--bg-secondary) 100%);
  }

  .sidebar-stat {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    padding: 10px 14px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-light);
  }

  .sidebar-stat__label { color: var(--text-tertiary); font-weight: 600; }
  .sidebar-stat__value { font-weight: 800; color: var(--success); font-family: var(--font-mono); }

  [data-theme="light"] .sidebar-stats {
    background: linear-gradient(180deg, #F1F1F3 0%, #F8F8F9 100%);
  }

  [data-theme="light"] .sidebar-stat {
    background: #FFFFFF;
    border: 1px solid #E4E4E7;
  }

  [data-theme="light"] .sidebar-stat__value {
    color: #059669;
  }

  .client-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: var(--radius-xl);
    cursor: pointer;
    transition: all var(--transition-base);
    border: 1px solid transparent;
    margin: 0 12px 8px;
    width: calc(100% - 24px);
    background: rgba(255, 255, 255, 0.015);
    position: relative;
    overflow: hidden;
  }

  .client-item::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.08), transparent);
    opacity: 0;
    transition: opacity var(--transition-base);
  }

  .client-item:hover {
    background: var(--bg-elevated);
    transform: translateX(4px);
    border-color: var(--border-light);
    box-shadow: var(--shadow-md);
  }

  .client-item:hover::before {
    opacity: 0.05;
  }

  .client-item--active {
    background: linear-gradient(135deg, var(--surface) 0%, var(--bg-elevated) 100%);
    border-color: #8B5CF6;
    box-shadow: var(--shadow-xl), 0 0 20px rgba(139, 92, 246, 0.15);
    transform: translateX(6px);
  }

  .client-item--active::before {
    opacity: 0.1;
  }

  .client-item--active::after {
    content: '';
    position: absolute;
    left: 0;
    top: 20%;
    height: 60%;
    width: 3px;
    background: linear-gradient(180deg, #8B5CF6, #7C3AED);
    border-radius: var(--radius-full);
    box-shadow: 0 0 12px #8B5CF6;
  }

  [data-theme="light"] .client-item {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid var(--border-light);
  }

  [data-theme="light"] .client-item:hover {
    background: #FFFFFF;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  [data-theme="light"] .client-item--active {
    background: linear-gradient(135deg, #FFFFFF 0%, #F8F8F9 100%);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.15);
  }

  [data-theme="light"] .client-item__avatar {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2);
  }

  [data-theme="light"] .client-item:hover .client-item__avatar {
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .client-item__avatar {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: white;
    font-size: 1.35rem;
    flex-shrink: 0;
    font-family: var(--font-heading);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15);
    transition: all var(--transition-spring);
    position: relative;
    overflow: hidden;
  }

  .client-item__avatar::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%);
  }

  .client-item:hover .client-item__avatar {
    transform: scale(1.08) rotate(-3deg);
    box-shadow: 0 6px 16px rgba(0,0,0,0.25);
  }

  .client-item__info {
    flex: 1;
    min-width: 0;
  }

  .client-item__row1 {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
  }

  .client-item__name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .client-item__date {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .client-item__sub {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
  }

  .client-item__phone {
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-weight: 500;
  }

  .role-tag {
    padding: 4px 10px;
    border-radius: var(--radius-md);
    font-weight: 700;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }

  .empty-state {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;
    background: radial-gradient(circle at center top, var(--bg-secondary) 0%, var(--bg-primary) 60%);
    position: relative;
  }

  .empty-state::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
    opacity: 0.1;
    pointer-events: none;
  }

  .empty-state__icon {
    width: 140px;
    height: 140px;
    background: linear-gradient(135deg, var(--surface) 0%, var(--bg-tertiary) 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 32px;
    color: var(--text-tertiary);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-xl), 0 0 40px rgba(0,0,0,0.15);
    transform: rotate(-5deg);
    position: relative;
    overflow: hidden;
  }

  .empty-state__icon::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%);
  }

  [data-theme="light"] .empty-state {
    background: radial-gradient(circle at center top, #FFFFFF 0%, #F8F8F9 60%);
  }

  [data-theme="light"] .empty-state::before {
    background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
    opacity: 0.15;
  }

  [data-theme="light"] .empty-state__icon {
    background: linear-gradient(135deg, #FFFFFF 0%, #F1F1F3 100%);
    box-shadow: var(--shadow-xl), 0 8px 32px rgba(139, 92, 246, 0.1);
    border: 1px solid #E4E4E7;
  }

  [data-theme="light"] .empty-state h2 {
    background: linear-gradient(135deg, #09090B, #3F3F46);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .empty-state p {
    color: var(--text-tertiary);
    max-width: 380px;
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .alert--danger {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 20px;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: var(--radius-xl);
    color: var(--danger);
    position: relative;
    overflow: hidden;
  }

  .alert--danger::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.5), transparent);
  }

  .alert__text { flex: 1; }
  .alert__text strong { display: block; margin-bottom: 6px; font-size: 1.1rem; }
  .alert__text p { font-size: 0.9rem; opacity: 0.85; color: var(--text-secondary); }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .form-group { margin-bottom: 18px; }
  .form-label { display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-tertiary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
  .form-input {
    width: 100%;
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-elevated) 100%);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: 14px 16px;
    color: var(--text-primary);
    font-size: 0.9rem;
    font-family: var(--font-body);
    outline: none;
    transition: all var(--transition-fast);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
  }

  .form-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px var(--primary-glow), var(--shadow-md);
  }

  [data-theme="light"] .form-input {
    background: linear-gradient(135deg, #FFFFFF 0%, #F8F8F9 100%);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
  }

  [data-theme="light"] .form-input:focus {
    border-color: #8B5CF6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15), var(--shadow-md);
  }

  .form-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
  }

  .form-textarea {
    min-height: 90px;
    resize: vertical;
  }

  .modal--wide { max-width: 720px; }
  .modal--sm { max-width: 400px; }
  .modal__body { padding: 24px; }

  .modal__actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding-top: 24px;
    margin-top: 12px;
    border-top: 1px solid var(--border-light);
  }
`}</style>
