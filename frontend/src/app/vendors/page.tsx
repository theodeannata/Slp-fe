"use client";

import { useEffect, useState } from "react";
import { useAppStore, Vendor } from "@/lib/store";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VendorsPage() {
  const { t } = useTranslation();
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
      await api.vendors.delete(deleteConfirmVend.vendor_id);
      setSuccess(t.vendors.deletedSuccess);
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
        await api.vendors.update(selectedVend.vendor_id, formData);
        setSuccess(t.vendors.updatedSuccess);
      } else {
        // Add Vendor
        await api.vendors.create(formData);
        setSuccess(t.vendors.createdSuccess);
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
      header: t.vendors.vendorId,
      sortKey: "vendor_id" as keyof Vendor,
      accessor: (item: Vendor) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.vendor_id}</span>
      ),
    },
    {
      header: t.vendors.vendorName,
      sortKey: "vendor" as keyof Vendor,
      accessor: (item: Vendor) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{item.vendor}</span>
      ),
    },
    {
      header: t.vendors.npwpKtp,
      sortKey: "npwp_ktp" as keyof Vendor,
      accessor: (item: Vendor) => (
        <span className="text-slate-550 font-mono text-xs">{item.npwp_ktp || "-"}</span>
      ),
    },
    {
      header: t.vendors.address,
      sortKey: "address" as keyof Vendor,
      accessor: (item: Vendor) => (
        <span className="text-slate-550 max-w-[200px] truncate block" title={item.address}>
          {item.address}
        </span>
      ),
    },
    {
      header: t.vendors.city,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t.vendors.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.vendors.subtitle}
          </p>
        </div>

        <Button onClick={openAddModal} className="gap-2">
          <UserPlus className="w-4 h-4" />
          <span>{t.vendors.addNew}</span>
        </Button>
      </div>

      {/* Message Notifications */}
      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="py-2.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <AlertDescription className="text-xs">{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Datatable */}
      <Table
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder={t.vendors.searchPlaceholder}
        searchFilter={(item, query) =>
          (item.vendor ? item.vendor.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.vendor_id ? item.vendor_id.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.city ? item.city.toLowerCase().includes(query.toLowerCase()) : false)
        }
        actions={(item) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => openEditModal(item)}
              title={t.common.edit}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => handleDeleteClick(item)}
              disabled={isReadOnly}
              className={
                isReadOnly
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:text-destructive hover:bg-destructive/10"
              }
              title={t.common.delete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      />

      {/* Add / Edit Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedVend ? t.vendors.editVendor : t.vendors.addNew}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.vendors.vendorId}
              </Label>
              <Input
                type="text"
                disabled
                placeholder="Auto-generated"
                value={selectedVend ? selectedVend.vendor_id : "Auto-generated"}
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.vendors.vendorName}
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. Barentz Indonesia"
                {...register("vendor")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.vendors.npwpKtp}
              </Label>
              <Input
                type="text"
                placeholder="e.g. 12.345.678.9-012.000"
                {...register("npwp_ktp")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.vendors.city}
              </Label>
              <Input
                type="text"
                placeholder="e.g. Jakarta"
                {...register("city")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              {t.vendors.address}
            </Label>
            <textarea
              placeholder="e.g. Sudirman Cav 21"
              {...register("address")}
              rows={2}
              className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="gap-1.5"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{selectedVend ? t.common.save : t.common.add}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmVend}
        onClose={cancelDelete}
        title={t.common.confirmDeleteTitle}
        maxWidth="sm:max-w-md"
      >
        <div className="space-y-4 font-sans">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs leading-relaxed">
              {t.vendors.confirmDelete} <span className="font-bold">{deleteConfirmVend?.vendor}</span> (ID: <span className="font-mono font-semibold">{deleteConfirmVend?.vendor_id}</span>)? {t.common.cannotUndo}
            </AlertDescription>
          </Alert>

          <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-2 text-xs">
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-muted-foreground font-semibold">{t.vendors.vendorId}:</span>
              <span className="font-bold font-mono text-foreground">{deleteConfirmVend?.vendor_id}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-muted-foreground font-semibold">{t.vendors.vendorName}:</span>
              <span className="font-bold text-foreground">{deleteConfirmVend?.vendor}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-muted-foreground font-semibold">{t.vendors.npwpKtp}:</span>
              <span className="text-foreground">{deleteConfirmVend?.npwp_ktp || "-"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-muted-foreground font-semibold">{t.vendors.city}:</span>
              <span className="text-foreground">{deleteConfirmVend?.city || "-"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-muted-foreground font-semibold">{t.vendors.address}:</span>
              <span className="text-foreground truncate block" title={deleteConfirmVend?.address || ""}>
                {deleteConfirmVend?.address || "-"}
              </span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={cancelDelete}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isLoading}
              className="gap-1.5"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t.common.delete}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
