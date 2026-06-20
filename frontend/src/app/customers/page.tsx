"use client";

import { useEffect, useState } from "react";
import { useAppStore, Customer } from "@/lib/store";
import { api } from "@/lib/api";
import { Table } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { useForm } from "react-hook-form";
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserPlus,
} from "lucide-react";

export default function CustomersPage() {
  const { customers, role, isMockMode, setCustomers } = useAppStore();
  const [data, setData] = useState<Customer[]>(customers);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmCust, setDeleteConfirmCust] = useState<Customer | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form setup
  const { register, handleSubmit, reset, setValue } = useForm<Customer>();

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let list: Customer[] = [];
      if (isMockMode) {
        list = useAppStore.getState().customers;
      } else {
        list = await api.customers.list();
      }
      const sorted = [...list].sort((a, b) => a.customer.localeCompare(b.customer));
      setData(sorted);
      if (!isMockMode) {
        setCustomers(list);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMockMode]);

  const openAddModal = () => {
    setSelectedCust(null);
    reset({
      customer_id: "",
      customer: "",
      npwp_ktp: "",
      address: "",
      city: "",
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setSelectedCust(cust);
    reset({
      ...cust,
      is_active: cust.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleDeleteClick = (cust: Customer) => {
    setDeleteConfirmCust(cust);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmCust) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      if (role === "admin") {
        throw new Error("Access Denied: Only Master role accounts can delete customers.");
      }
      await api.customers.delete(deleteConfirmCust.customer_id);
      setSuccess(`Customer "${deleteConfirmCust.customer}" deleted successfully.`);
      setDeleteConfirmCust(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmCust(null);
  };

  const onSubmit = async (formData: Customer) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (selectedCust) {
        // Edit Customer
        await api.customers.update(selectedCust.customer_id, formData);
        setSuccess(`Customer ${formData.customer} updated successfully.`);
      } else {
        // Add Customer
        await api.customers.create(formData);
        setSuccess(`Customer ${formData.customer} created successfully.`);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to submit customer form.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: "Customer ID",
      sortKey: "customer_id" as keyof Customer,
      accessor: (item: Customer) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.customer_id}</span>
      ),
    },
    {
      header: "Name",
      sortKey: "customer" as keyof Customer,
      accessor: (item: Customer) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{item.customer}</span>
      ),
    },
    {
      header: "NPWP / KTP",
      sortKey: "npwp_ktp" as keyof Customer,
      accessor: (item: Customer) => (
        <span className="text-slate-550 font-mono text-xs">{item.npwp_ktp || "-"}</span>
      ),
    },
    {
      header: "Address",
      sortKey: "address" as keyof Customer,
      accessor: (item: Customer) => (
        <span className="text-slate-550 max-w-[200px] truncate block" title={item.address}>
          {item.address}
        </span>
      ),
    },
    {
      header: "City",
      sortKey: "city" as keyof Customer,
      accessor: (item: Customer) => <span className="text-slate-600 dark:text-slate-400">{item.city}</span>,
    },
    {
      header: "Status",
      sortKey: "is_active" as any,
      accessor: (item: Customer) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider
            ${
              item.is_active !== false
                ? "bg-emerald-500/10 border-emerald-500/20 text-accent-green"
                : "bg-rose-500/10 border-rose-500/20 text-accent-red"
            }`}
        >
          {item.is_active !== false ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Customers Ledger
          </h1>
          <p className="text-xs text-slate-550 mt-0.5">
            Create, view, and maintain details of SLP ERP business partners.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Message Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl border bg-red-500/10 text-accent-red border-red-500/20 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl border bg-emerald-500/10 text-accent-green border-emerald-500/20 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}



      {/* Main Datatable */}
      <Table
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Search customer by name, ID or city..."
        searchFilter={(item, query) =>
          (item.customer ? item.customer.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.customer_id ? item.customer_id.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.city ? item.city.toLowerCase().includes(query.toLowerCase()) : false)
        }
        actions={(item) => (
          <>
            <button
              onClick={() => openEditModal(item)}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Edit Customer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteClick(item)}
              disabled={role === "admin"}
              className={`p-1.5 rounded-lg border border-border-custom hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-accent-red transition-colors cursor-pointer
                ${role === "admin" ? "opacity-30 cursor-not-allowed" : ""}`}
              title={role === "admin" ? "Master Only feature" : "Delete Customer"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      />

      {/* Add / Edit Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedCust ? "Edit Customer Record" : "Register New Customer"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Customer ID
              </label>
              <input
                type="text"
                disabled
                placeholder="Auto-generated"
                value={selectedCust ? selectedCust.customer_id : "Auto-generated"}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm focus:outline-none text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Customer Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Agus Catur"
                {...register("customer")}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                NPWP / KTP Number
              </label>
              <input
                type="text"
                placeholder="e.g. 12.345.678.9-012.000"
                {...register("npwp_ktp")}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                City Location
              </label>
              <input
                type="text"
                placeholder="e.g. Jakarta"
                {...register("city")}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Street Address
            </label>
            <textarea
              placeholder="e.g. Jakarta Barat"
              {...register("address")}
              rows={2}
              className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {selectedCust && (
            <div className="flex items-center gap-2.5 p-3.5 border border-border-custom rounded-xl bg-slate-50/50 dark:bg-zinc-900/25">
              <input
                type="checkbox"
                id="is_active"
                {...register("is_active")}
                className="w-4 h-4 text-primary focus:ring-primary/30 border-border-custom rounded cursor-pointer"
              />
              <label htmlFor="is_active" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Mark as Active Customer
              </label>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border-custom">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{selectedCust ? "Update Customer" : "Create Customer"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmCust}
        onClose={cancelDelete}
        title="Delete Customer Record"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 font-sans">
          <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-accent-red/20 rounded-xl text-xs">
            <AlertCircle className="w-5 h-5 text-accent-red shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-600 dark:text-slate-350">
              <p className="font-bold text-foreground">Warning: Deletion is Permanent</p>
              <p className="leading-relaxed">
                You are about to delete <span className="font-bold text-foreground">{deleteConfirmCust?.customer}</span> (ID: <span className="font-mono font-semibold">{deleteConfirmCust?.customer_id}</span>). All transactions, invoice history, and ledger bounds associated with this customer record may be affected.
              </p>
            </div>
          </div>

          <div className="border border-border-custom rounded-xl p-4 bg-slate-50/50 dark:bg-zinc-900/20 space-y-2 text-xs">
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400 font-semibold">Customer ID:</span>
              <span className="font-bold font-mono text-foreground">{deleteConfirmCust?.customer_id}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400 font-semibold">Name:</span>
              <span className="font-bold text-foreground">{deleteConfirmCust?.customer}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400 font-semibold">NPWP / KTP:</span>
              <span className="text-foreground">{deleteConfirmCust?.npwp_ktp || "-"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400 font-semibold">Location:</span>
              <span className="text-foreground">{deleteConfirmCust?.city || "-"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400 font-semibold">Address:</span>
              <span className="text-foreground truncate block" title={deleteConfirmCust?.address || ""}>
                {deleteConfirmCust?.address || "-"}
              </span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border-custom">
            <button
              type="button"
              onClick={cancelDelete}
              className="px-4 py-2 border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isLoading}
              className="px-4 py-2 bg-accent-red hover:bg-red-600 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Delete Customer</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
