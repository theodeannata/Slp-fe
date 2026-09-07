"use client";

import { useEffect, useState } from "react";
import { useAppStore, Payment } from "@/lib/store";
import { api } from "@/lib/api";
import { Table } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { useTranslation } from "@/lib/i18n";
import { useForm } from "react-hook-form";
import {
  Plus,
  Coins,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PaymentsPage() {
  const { t, formatCurrency } = useTranslation();
  const { payments, sales, role, isMockMode } = useAppStore();
  const [data, setData] = useState<Payment[]>(payments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form setup
  const { register, handleSubmit, reset, setValue } = useForm<Payment>();

  // Filter sales invoices that are unpaid for easy binding selection
  const unpaidSales = sales.filter((s) => s.sisa > 0);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let list: Payment[] = [];
      if (isMockMode) {
        list = useAppStore.getState().payments;
      } else {
        list = await api.payments.list();
      }
      const sorted = [...list].sort((a, b) => new Date(b.tgl_bayar).getTime() - new Date(a.tgl_bayar).getTime());
      setData(sorted);
    } catch (err: any) {
      setError(err.message || "Failed to load payments journal.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMockMode, payments]);

  const handleInvoiceChange = (invNo: string) => {
    const sale = sales.find((s) => s.no_sj_inv === invNo);
    if (sale) {
      setValue("customer", sale.customer);
      setValue("nilai_bayar_invoice", sale.sisa);
      setValue("nilai_transfer", sale.sisa);
    }
  };

  const openAddModal = () => {
    reset({
      tgl_bayar: new Date().toISOString().split("T")[0],
      nilai_transfer: 0,
      no_invoice: unpaidSales[0]?.no_sj_inv || "",
      customer: unpaidSales[0]?.customer || "",
      nilai_bayar_invoice: unpaidSales[0]?.sisa || 0,
      note: "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (formData: Payment) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      formData.nilai_transfer = Number(formData.nilai_transfer);
      formData.nilai_bayar_invoice = Number(formData.nilai_bayar_invoice);

      await api.payments.create(formData);
      setSuccess(`Payment of ${formatRupiah(formData.nilai_bayar_invoice)} recorded for invoice ${formData.no_invoice}.`);
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to submit cash receipt.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const columns = [
    {
      header: t.payments.paymentDate,
      sortKey: "tgl_bayar" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.tgl_bayar}</span>
      ),
    },
    {
      header: t.payments.invoiceNo,
      sortKey: "no_invoice" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="font-semibold font-mono text-foreground">{item.no_invoice}</span>
      ),
    },
    {
      header: t.payments.customer,
      sortKey: "customer" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{item.customer}</span>
      ),
    },
    {
      header: t.payments.transferAmount,
      sortKey: "nilai_transfer" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="text-slate-650 dark:text-slate-350">{formatCurrency(item.nilai_transfer)}</span>
      ),
    },
    {
      header: t.payments.invoicePaidAmount,
      sortKey: "nilai_bayar_invoice" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="font-bold text-accent-green">{formatCurrency(item.nilai_bayar_invoice)}</span>
      ),
    },
    {
      header: t.payments.notes,
      sortKey: "note" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="text-slate-400 dark:text-slate-500 italic max-w-[250px] truncate block" title={item.note || ""}>
          {item.note || "-"}
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
            {t.payments.title}
          </h1>
          <p className="text-xs text-slate-550 mt-0.5">
            {t.payments.subtitle}
          </p>
        </div>

        <Button
          onClick={openAddModal}
          className="flex items-center gap-2"
        >
          <Coins className="w-4 h-4" />
          <span>{t.payments.addNew}</span>
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Datatable */}
      <Table
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder={t.payments.searchPlaceholder}
        searchFilter={(item, query) =>
          (item.no_invoice ? item.no_invoice.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.customer ? item.customer.toLowerCase().includes(query.toLowerCase()) : false)
        }
      />

      {/* Add payment receipt Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t.payments.addNew}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="no_invoice">{t.payments.invoiceNo}</Label>
            <select
              id="no_invoice"
              {...register("no_invoice")}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full h-9 px-3 py-1 border border-input rounded-md bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="" disabled>-- Choose Unpaid Invoice --</option>
              {unpaidSales.map((s) => (
                <option key={s.kode_unik} value={s.no_sj_inv}>
                  {s.no_sj_inv} — {s.customer} (Bal. {formatCurrency(s.sisa)})
                </option>
              ))}
              {unpaidSales.length === 0 && (
                <option value="" disabled>No unpaid invoices in ledger.</option>
              )}
            </select>
            {/* Hidden field for binding name */}
            <input type="hidden" {...register("customer")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tgl_bayar">{t.payments.paymentDate}</Label>
              <Input
                id="tgl_bayar"
                type="date"
                required
                {...register("tgl_bayar")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nilai_transfer">{t.payments.transferAmount}</Label>
              <Input
                id="nilai_transfer"
                type="number"
                step="0.01"
                required
                placeholder="0"
                {...register("nilai_transfer")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nilai_bayar_invoice">{t.payments.invoicePaidAmount}</Label>
            <Input
              id="nilai_bayar_invoice"
              type="number"
              step="0.01"
              required
              placeholder="0"
              {...register("nilai_bayar_invoice")}
              className="font-semibold text-emerald-600 dark:text-emerald-400"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">{t.payments.notes}</Label>
            <textarea
              id="note"
              placeholder="e.g. Di rekening non PT Mandiri"
              {...register("note")}
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border-custom">
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
              className="flex items-center gap-1.5"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t.payments.addNew}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
