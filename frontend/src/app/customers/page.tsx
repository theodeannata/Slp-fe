"use client";

import { useEffect, useState } from "react";
import { useAppStore, Customer } from "@/lib/store";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

export default function CustomersPage() {
  const { t } = useTranslation();
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
      setSuccess(t.customers.deletedSuccess);
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
        setSuccess(t.customers.updatedSuccess);
      } else {
        // Add Customer
        await api.customers.create(formData);
        setSuccess(t.customers.createdSuccess);
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
      header: t.customers.customerId,
      sortKey: "customer_id" as keyof Customer,
      accessor: (item: Customer) => (
        <span className="font-mono text-xs text-slate-500 font-semibold">{item.customer_id}</span>
      ),
    },
    {
      header: t.customers.customerName,
      sortKey: "customer" as keyof Customer,
      accessor: (item: Customer) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{item.customer}</span>
      ),
    },
    {
      header: t.customers.npwpKtp,
      sortKey: "npwp_ktp" as keyof Customer,
      accessor: (item: Customer) => (
        <span className="text-slate-550 font-mono text-xs">{item.npwp_ktp || "-"}</span>
      ),
    },
    {
      header: t.customers.address,
      sortKey: "address" as keyof Customer,
      accessor: (item: Customer) => (
        <span className="text-slate-550 max-w-[200px] truncate block" title={item.address}>
          {item.address}
        </span>
      ),
    },
    {
      header: t.customers.city,
      sortKey: "city" as keyof Customer,
      accessor: (item: Customer) => <span className="text-slate-600 dark:text-slate-400">{item.city}</span>,
    },
    {
      header: t.common.status,
      sortKey: "is_active" as any,
      accessor: (item: Customer) => (
        <Badge
          variant="outline"
          className={`text-[10px] font-bold uppercase tracking-wider ${
            item.is_active !== false
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
          }`}
        >
          {item.is_active !== false ? t.common.active : t.common.inactive}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t.customers.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.customers.subtitle}
          </p>
        </div>

        <Button onClick={openAddModal} className="gap-2">
          <UserPlus className="w-4 h-4" />
          <span>{t.customers.addNew}</span>
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
        searchPlaceholder={t.customers.searchPlaceholder}
        searchFilter={(item, query) =>
          (item.customer ? item.customer.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.customer_id ? item.customer_id.toLowerCase().includes(query.toLowerCase()) : false) ||
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
              disabled={role === "admin"}
              className={
                role === "admin"
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
        title={selectedCust ? t.customers.editCustomer : t.customers.addNew}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.customers.customerId}
              </Label>
              <Input
                type="text"
                disabled
                placeholder="Auto-generated"
                value={selectedCust ? selectedCust.customer_id : "Auto-generated"}
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.customers.customerName}
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. Agus Catur"
                {...register("customer")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.customers.npwpKtp}
              </Label>
              <Input
                type="text"
                placeholder="e.g. 12.345.678.9-012.000"
                {...register("npwp_ktp")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.customers.city}
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
              {t.customers.address}
            </Label>
            <textarea
              placeholder="e.g. Jakarta Barat"
              {...register("address")}
              rows={2}
              className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {selectedCust && (
            <div className="flex items-center justify-between p-3.5 border border-border rounded-xl bg-muted/20">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="text-xs font-semibold cursor-pointer">
                  {t.common.status}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {t.customers.activeStatus}
                </p>
              </div>
              <Switch
                id="is_active"
                defaultChecked={selectedCust.is_active !== false}
                onCheckedChange={(checked) => setValue("is_active", checked)}
              />
            </div>
          )}

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
              <span>{selectedCust ? t.common.save : t.common.add}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmCust}
        onClose={cancelDelete}
        title={t.common.confirmDeleteTitle}
        maxWidth="sm:max-w-md"
      >
        <div className="space-y-4 font-sans">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs leading-relaxed">
              {t.customers.confirmDelete} <span className="font-bold">{deleteConfirmCust?.customer}</span> (ID: <span className="font-mono font-semibold">{deleteConfirmCust?.customer_id}</span>)? {t.common.cannotUndo}
            </AlertDescription>
          </Alert>

          <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-2 text-xs">
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-muted-foreground font-semibold">{t.customers.customerId}:</span>
              <span className="font-bold font-mono text-foreground">{deleteConfirmCust?.customer_id}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-muted-foreground font-semibold">{t.customers.customerName}:</span>
              <span className="font-bold text-foreground">{deleteConfirmCust?.customer}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-muted-foreground font-semibold">{t.customers.npwpKtp}:</span>
              <span className="text-foreground">{deleteConfirmCust?.npwp_ktp || "-"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-muted-foreground font-semibold">{t.customers.city}:</span>
              <span className="text-foreground">{deleteConfirmCust?.city || "-"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr]">
              <span className="text-muted-foreground font-semibold">{t.customers.address}:</span>
              <span className="text-foreground truncate block" title={deleteConfirmCust?.address || ""}>
                {deleteConfirmCust?.address || "-"}
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
