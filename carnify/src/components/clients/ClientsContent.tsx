"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useClientStore, ClientProfile, ClientFormData, ClientMovement, ClientPeriod } from "@/stores/useClientStore";
import { downloadComprobantePago, downloadCartola } from "@/lib/pdfUtils";
import {
  getClients, createClient as dbCreateClient, updateClient as dbUpdateClient,
  deleteClient as dbDeleteClient, addPayment as dbAddPayment,
  addSaleToAccount as dbAddSaleToAccount, closePeriod as dbClosePeriod,
} from "@/actions/clients";
import ClientSidebar from "./ClientSidebar";
import ClientEmptyState from "./ClientEmptyState";
import ClientProfilePanel from "./ClientProfilePanel";
import ClientFormModal from "./ClientFormModal";
import { PaymentModal, ReceiptModal, SaleModal, ClosePeriodModal, DeleteConfirmModal } from "./ClientPaymentModals";

type ModalType = "none" | "addClient" | "editClient" | "payment" | "newSale" | "deleteConfirm" | "receipt" | "closePeriod";
type FilterType = "all" | "debt" | "overdue";

const EMPTY_FORM: ClientFormData = {
  name: "", dni: "", phone: "", address: "",
  email: "", notes: "", creditLimit: 1000000, status: "active",
};

type DbClientMovement = {
  id: string; date: Date | string; type: string; amount: number;
  balanceAfter: number; description: string; ticketId?: string | null;
  paymentMethod?: string | null; periodId?: string | null;
};

type DbClientPeriod = {
  id: string; label: string; openedAt: Date | string; closedAt: Date | string;
  closedReason: string; totalSales: number; totalPaid: number; finalBalance: number;
};

type DbClient = {
  id: string; name: string; dni: string; phone: string; address: string;
  email: string; notes: string; creditLimit: number; balance: number;
  status: string; lastActivity: Date | string; createdAt: Date | string;
  movements: DbClientMovement[]; periods: DbClientPeriod[];
};

function mapDbToProfile(c: DbClient): ClientProfile {
  const currentMovements: ClientMovement[] = c.movements
    .filter((m) => !m.periodId)
    .map((m) => ({
      id: m.id, date: new Date(m.date).toISOString(),
      type: m.type as "sale" | "payment", amount: m.amount,
      balanceAfter: m.balanceAfter, description: m.description,
      ticketId: m.ticketId ?? undefined, paymentMethod: m.paymentMethod ?? undefined,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const periods: ClientPeriod[] = c.periods.map((p) => ({
    id: p.id, label: p.label,
    openedAt: new Date(p.openedAt).toISOString(),
    closedAt: new Date(p.closedAt).toISOString(),
    closedReason: p.closedReason as "settled" | "month_end" | "manual",
    movements: c.movements.filter((m) => m.periodId === p.id).map((m) => ({
      id: m.id, date: new Date(m.date).toISOString(),
      type: m.type as "sale" | "payment", amount: m.amount,
      balanceAfter: m.balanceAfter, description: m.description,
      ticketId: m.ticketId ?? undefined, paymentMethod: m.paymentMethod ?? undefined,
    })),
    totalSales: p.totalSales, totalPaid: p.totalPaid, finalBalance: p.finalBalance,
  }));

  return {
    id: c.id, name: c.name, dni: c.dni, phone: c.phone, address: c.address,
    email: c.email, notes: c.notes, creditLimit: c.creditLimit, balance: c.balance,
    status: c.status as "active" | "overdue" | "blocked",
    lastActivity: new Date(c.lastActivity).toISOString(),
    createdAt: new Date(c.createdAt).toISOString(),
    movements: currentMovements, periods,
  };
}

export default function ClientsContent() {
  const { clients, selectedClientId, setSelectedClient, hydrate } = useClientStore();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [modal, setModal] = useState<ModalType>("none");

  const [clientForm, setClientForm] = useState<ClientFormData>(EMPTY_FORM);
  const [paymentForm, setPaymentForm] = useState({ amount: "", note: "", method: "cash" });
  const [saleForm, setSaleForm] = useState({ amount: "", description: "Venta libre en cuenta corriente" });
  const [lastReceipt, setLastReceipt] = useState<{ movement: ClientMovement; prevBalance: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const errorMsg = (e: unknown, fallback: string) => {
    const msg = e instanceof Error ? e.message : "";
    return msg && !msg.includes("Server Components render") ? msg : fallback;
  };

  const [now] = useState(() => Date.now());

  const refreshClients = useCallback(async () => {
    const data = await getClients();
    hydrate(data.map(mapDbToProfile));
  }, [hydrate]);

  useEffect(() => { void refreshClients(); }, [refreshClients]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const filteredClients = useMemo(() => {
    let list = clients;
    if (filter === "debt") list = list.filter((c) => c.balance > 0);
    if (filter === "overdue") list = list.filter((c) => c.status === "overdue");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) || c.dni.includes(q) || c.phone.includes(q),
      );
    }
    return list.slice().sort((a, b) => b.balance - a.balance);
  }, [clients, filter, search]);

  const clientStats = useMemo(() => {
    if (!selectedClient) return null;
    const totalSales = selectedClient.movements.filter((m) => m.type === "sale").reduce((s, m) => s + m.amount, 0);
    const totalPaid = selectedClient.movements.filter((m) => m.type === "payment").reduce((s, m) => s + m.amount, 0);
    const salesCount = selectedClient.movements.filter((m) => m.type === "sale").length;
    return { totalSales, totalPaid, salesCount };
  }, [selectedClient]);

  const sidebarStats = useMemo(() => ({
    total: clients.length,
    withDebt: clients.filter((c) => c.balance > 0).length,
    overdue: clients.filter((c) => c.status === "overdue").length,
    totalDebt: clients.reduce((s, c) => s + Math.max(0, c.balance), 0),
  }), [clients]);

  function relativeDate(dateStr: string): string {
    const days = Math.floor((now - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "Hoy";
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`;
    return `Hace ${Math.floor(days / 30)} meses`;
  }

  function openAddClient() { setClientForm(EMPTY_FORM); setActionError(null); setModal("addClient"); }

  function openEditClient() {
    if (!selectedClient) return;
    setActionError(null);
    setClientForm({
      name: selectedClient.name, dni: selectedClient.dni, phone: selectedClient.phone,
      address: selectedClient.address, email: selectedClient.email, notes: selectedClient.notes,
      creditLimit: selectedClient.creditLimit, status: selectedClient.status,
    });
    setModal("editClient");
  }

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setActionBusy(true);
    try {
      if (modal === "addClient") await dbCreateClient(clientForm);
      else if (selectedClient) await dbUpdateClient(selectedClient.id, clientForm);
      await refreshClients();
      setModal("none");
    } catch (err) {
      setActionError(errorMsg(err, "No se pudo guardar el cliente. Intentá de nuevo."));
    } finally {
      setActionBusy(false);
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    const prevBalance = selectedClient.balance;
    setActionError(null);
    setActionBusy(true);
    try {
      await dbAddPayment(selectedClient.id, amount, paymentForm.note, paymentForm.method);
      await refreshClients();
      const freshClient = useClientStore.getState().clients.find((c) => c.id === selectedClient.id);
      const movement = freshClient?.movements[0];
      if (movement?.type === "payment") {
        setLastReceipt({ movement, prevBalance });
        setModal("receipt");
      } else setModal("none");
      setPaymentForm({ amount: "", note: "", method: "cash" });
    } catch (err) {
      setActionError(errorMsg(err, "No se pudo registrar el pago. Intentá de nuevo."));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleNewSale(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    const amount = parseFloat(saleForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    setActionError(null);
    setActionBusy(true);
    try {
      await dbAddSaleToAccount(selectedClient.id, amount, saleForm.description);
      await refreshClients();
      setSaleForm({ amount: "", description: "Venta libre en cuenta corriente" });
      setModal("none");
    } catch (err) {
      setActionError(errorMsg(err, "No se pudo registrar la venta. Intentá de nuevo."));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeleteClient() {
    if (!selectedClient) return;
    setActionError(null);
    setActionBusy(true);
    try {
      await dbDeleteClient(selectedClient.id);
      setSelectedClient(null);
      await refreshClients();
      setModal("none");
    } catch (err) {
      setActionError(errorMsg(err, "No se pudo eliminar el cliente."));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleClosePeriod(reason: ClientPeriod["closedReason"]) {
    if (!selectedClient) return;
    await dbClosePeriod(selectedClient.id, reason);
    await refreshClients();
    setModal("none");
  }

  function handleDownloadCartola() { if (selectedClient) downloadCartola(selectedClient); }
  function handleDownloadReceipt() { if (selectedClient && lastReceipt) downloadComprobantePago(selectedClient, lastReceipt.movement, lastReceipt.prevBalance); }
  function closeModal() { setModal("none"); setActionError(null); }

  const handleSelectClient = (id: string) => {
    setSelectedClient(id);
  };

  return (
    <div className="crm-layout">
      <ClientSidebar
        search={search}
        onSearchChange={setSearch}
        onSearchClear={() => setSearch("")}
        filter={filter}
        onFilterChange={setFilter}
        stats={sidebarStats}
        filteredClients={filteredClients}
        selectedClientId={selectedClientId}
        onSelectClient={handleSelectClient}
        onAddClient={openAddClient}
        relativeDate={relativeDate}
      />

      <div className="crm-main">
        {!selectedClient ? (
          <ClientEmptyState
            onAddClient={openAddClient}
            totalDebt={sidebarStats.totalDebt}
            totalClients={sidebarStats.total}
            overdueCount={sidebarStats.overdue}
          />
        ) : (
          <ClientProfilePanel
            client={selectedClient}
            stats={clientStats}
            onEdit={openEditClient}
            onDelete={() => { setActionError(null); setModal("deleteConfirm"); }}
            onPayment={() => { setActionError(null); setModal("payment"); }}
            onNewSale={() => { setActionError(null); setModal("newSale"); }}
            onClosePeriod={() => { setActionError(null); setModal("closePeriod"); }}
            onDownloadCartola={handleDownloadCartola}
          />
        )}
      </div>

      {(modal === "addClient" || modal === "editClient") && (
        <ClientFormModal
          mode={modal === "addClient" ? "add" : "edit"}
          form={clientForm}
          onChange={setClientForm}
          onSubmit={handleSaveClient}
          onClose={closeModal}
          error={actionError}
          busy={actionBusy}
        />
      )}

      {modal === "payment" && selectedClient && (
        <PaymentModal
          client={selectedClient}
          form={paymentForm}
          onChange={setPaymentForm}
          onSubmit={handlePayment}
          onClose={closeModal}
          error={actionError}
          busy={actionBusy}
        />
      )}

      {modal === "receipt" && selectedClient && lastReceipt && (
        <ReceiptModal
          client={selectedClient}
          movement={lastReceipt.movement}
          prevBalance={lastReceipt.prevBalance}
          onDownload={handleDownloadReceipt}
          onClose={closeModal}
        />
      )}

      {modal === "newSale" && selectedClient && (
        <SaleModal
          client={selectedClient}
          form={saleForm}
          onChange={setSaleForm}
          onSubmit={handleNewSale}
          onClose={closeModal}
          error={actionError}
          busy={actionBusy}
        />
      )}

      {modal === "closePeriod" && selectedClient && (
        <ClosePeriodModal
          client={selectedClient}
          onClosePeriod={handleClosePeriod}
          onClose={closeModal}
        />
      )}

      {modal === "deleteConfirm" && selectedClient && (
        <DeleteConfirmModal
          clientName={selectedClient.name}
          onConfirm={handleDeleteClient}
          onClose={closeModal}
          error={actionError}
          busy={actionBusy}
        />
      )}
    </div>
  );
}
