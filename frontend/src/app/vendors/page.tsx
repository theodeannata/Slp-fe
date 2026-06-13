"use client";

import { useEffect, useState } from "react";
import { useAppStore, Vendor } from "@/lib/store";
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

export default function VendorsPage() {
  const { vendors, role, isMockMode, setVendors } = useAppStore();
  const [data, setData] = useState<Vendor[]>(vendors);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmVend, setDeleteConfirmVend] = useState<Vendor | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVend, setSelectedVend] = useState<Vendor | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form setup
  const { register, handleSubmit, reset, setValue } = useForm<Vendor>();

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let list: Vendor[] = [];
      if (isMockMode) {
        list = useAppStore.getState().vendors;
      } else {
        list = await api.vendors.list();
      }
      const sorted = [...list].sort((a, b) => a.vendor.localeCompare(b.vendor));
      setData(sorted);
      if (!isMockMode) {
        setVendors(list);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load vendors.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMockMode]);

  const openAddModal = () => {
    setSelectedVend(null);
    reset({
      vendor_id: "",
      vendor: "",
      npwp_ktp: "",
      address: "",
      city: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (vend: Vendor) => {
    setSelectedVend(vend);
    reset(vend);
    setModalOpen(true);
  };

  const handleDeleteClick = (vend: Vendor) => {
    setDeleteConfirmVend(vend);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmVend) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      if (role === "admin") {
        throw new Error("Access Denied: Only Master and DB Admin role accounts can delete vendors.");
      }
      if (isMockMode) {
        useAppStore.getState().deleteVendor(deleteConfirmVend.vendor_id);
      } else {
        await api.vendors.delete(deleteConfirmVend.vendor_id);
      }
      setSuccess(`Vendor "${deleteConfirmVend.vendor}" deleted successfully.`);
      setDeleteConfirmVend(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmVend(null);
  };

  const onSubmit = async (formData: Vendor) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (selectedVend) {
        // Edit Vendor
        if (isMockMode) {
          useAppStore.getState().updateVendor(selectedVend.vendor_id, formData);
        } else {
          await api.vendors.update(selectedVend.vendor_id, formData);
        }
        setSuccess(`Vendor ${formData.vendor} updated successfully.`);
      } else {
        // Add Vendor
        if (isMockMode) {
          useAppStore.getState().addVendor(formData);
        } else {
          await api.vendors.create(formData);
        }
        setSuccess(`Vendor ${formData.vendor} created successfully.`);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to submit vendor form.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: "Vendor ID",
      sortKey: "vendor_id" as keyof Vendor,
      accessor: (item: Vendor) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.vendor_id}</span>
      ),
    },
    {
      header: "Name",
      sortKey: "vendor" as keyof Vendor,
      accessor: (item: Vendor) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{item.vendor}</span>
      ),
    },
    {
      header: "NPWP / KTP",
      sortKey: "npwp_ktp" as keyof Vendor,
      accessor: (item: Vendor) => (
        <span className="text-slate-550 font-mono text-xs">{item.npwp_ktp || "-"}</span>
      ),
    },
    {
      header: "Address",
      sortKey: "address" as keyof Vendor,
      accessor: (item: Vendor) => (
        <span className="text-slate-550 max-w-[200px] truncate block" title={item.address}>
          {item.address}
        </span>
      ),
    },
    {
      header: "City",
      sortKey: "city" as keyof Vendor,
      accessor: (item: Vendor) => <span className="text-slate-600 dark:text-slate-400">{item.city}</span>,
    },
  ];

  const isReadOnly = role === "admin";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Vendors Registry
          </h1>
          <p className="text-xs text-slate-550 mt-0.5">
            Create, view, and maintain details of SLP ERP suppliers and vendors.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Vendor</span>
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
        searchPlaceholder="Search vendor by name, ID or city..."
        searchFilter={(item, query) =>
          (item.vendor ? item.vendor.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.vendor_id ? item.vendor_id.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.city ? item.city.toLowerCase().includes(query.toLowerCase()) : false)
        }
        actions={(item) => (
          <>
            <button
              onClick={() => openEditModal(item)}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Edit Vendor"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteClick(item)}
              disabled={isReadOnly}
              className={`p-1.5 rounded-lg border border-border-custom hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-accent-red transition-colors cursor-pointer
                ${isReadOnly ? "opacity-30 cursor-not-allowed" : ""}`}
              title={isReadOnly ? "Master / DB Admin Only feature" : "Delete Vendor"}
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
        title={selectedVend ? "Edit Vendor Record" : "Register New Vendor"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Vendor ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. V001"
                {...register("vendor_id")}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
              {selectedVend && (
                <p className="text-[10px] text-amber-500 font-medium leading-tight">
                  Changing ID will cascade update all purchase records.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Vendor Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Barentz Indonesia"
                {...register("vendor")}
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
              placeholder="e.g. Sudirman Cav 21"
              {...register("address")}
              rows={2}
              className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

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
              <span>{selectedVend ? "Update Vendor" : "Create Vendor"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmVend}
        onClose={cancelDelete}
        title="Delete Vendor Record"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 font-sans">
          <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-accent-red/20 rounded-xl text-xs">
            <AlertCircle className="w-5 h-5 text-accent-red shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-600 dark:text-slate-350">
              <p className="font-bold text-foreground">Warning: Deletion is Permanent</p>
              <p className="leading-relaxed">
                You are about to delete <span className="font-bold text-foreground">{deleteConfirmVend?.vendor}</span> (ID: <span className="font-mono font-semibold">{deleteConfirmVend?.vendor_id}</span>). All transactions, purchase PO history, and ledger bounds associated with this vendor record may be affected.
              </p>
            </div>
          </div>

          <div className="border border-border-custom rounded-xl p-4 bg-slate-50/50 dark:bg-zinc-900/20 space-y-2 text-xs">
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400 font-semibold">Vendor ID:</span>
              <span className="font-bold font-mono text-foreground">{deleteConfirmVend?.vendor_id}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400 font-semibold">Name:</span>
              <span className="font-bold text-foreground">{deleteConfirmVend?.vendor}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400 font-semibold">NPWP / KTP:</span>
              <span className="text-foreground">{deleteConfirmVend?.npwp_ktp || "-"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400 font-semibold">Location:</span>
              <span className="text-foreground">{deleteConfirmVend?.city || "-"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-slate-400 font-semibold">Address:</span>
              <span className="text-foreground truncate block" title={deleteConfirmVend?.address || ""}>
                {deleteConfirmVend?.address || "-"}
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
              <span>Delete Vendor</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
