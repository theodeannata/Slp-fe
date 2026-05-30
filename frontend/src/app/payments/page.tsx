"use client";

import { useEffect, useState } from "react";
import { useAppStore, Payment } from "@/lib/store";
import { api } from "@/lib/api";
import { Table } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { useForm } from "react-hook-form";
import {
  Plus,
  Coins,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function PaymentsPage() {
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
      header: "Payment Date",
      sortKey: "tgl_bayar" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.tgl_bayar}</span>
      ),
    },
    {
      header: "Invoice Reference",
      sortKey: "no_invoice" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="font-semibold font-mono text-foreground">{item.no_invoice}</span>
      ),
    },
    {
      header: "Customer Partner",
      sortKey: "customer" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{item.customer}</span>
      ),
    },
    {
      header: "Transfer Amount",
      sortKey: "nilai_transfer" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="text-slate-650 dark:text-slate-350">{formatRupiah(item.nilai_transfer)}</span>
      ),
    },
    {
      header: "Applied to Invoice",
      sortKey: "nilai_bayar_invoice" as keyof Payment,
      accessor: (item: Payment) => (
        <span className="font-bold text-accent-green">{formatRupiah(item.nilai_bayar_invoice)}</span>
      ),
    },
    {
      header: "Notes / Memo",
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
            Payments & Cash Receipts Ledger
          </h1>
          <p className="text-xs text-slate-550 mt-0.5">
            Log, track, and bind cash bank payments with sales invoices.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
        >
          <Coins className="w-4 h-4" />
          <span>Log Cash Receipt</span>
        </button>
      </div>

      {/* Messages */}
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
        searchPlaceholder="Search payments by invoice reference or customer..."
        searchFilter={(item, query) =>
          (item.no_invoice ? item.no_invoice.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.customer ? item.customer.toLowerCase().includes(query.toLowerCase()) : false)
        }
      />

      {/* Add payment receipt Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log Cash Receipt Transfer"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">
              Select Unsettled Invoice
            </label>
            <select
              {...register("no_invoice")}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="" disabled>-- Choose Unpaid Invoice --</option>
              {unpaidSales.map((s) => (
                <option key={s.kode_unik} value={s.no_sj_inv}>
                  {s.no_sj_inv} — {s.customer} (Bal. {formatRupiah(s.sisa)})
                </option>
              ))}
              {unpaidSales.length === 0 && (
                <option value="" disabled>No unpaid invoices in ledger.</option>
              )}
            </select>
            {/* Hidden field for binding name */}
            <input type="hidden" {...register("customer")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Payment Date</label>
              <input
                type="date"
                required
                {...register("tgl_bayar")}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Transfer Amount (IDR)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0"
                {...register("nilai_transfer")}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">
              Applied Invoice Clearance Value (IDR)
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0"
              {...register("nilai_bayar_invoice")}
              className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm font-semibold text-accent-green"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Memo Notes</label>
            <textarea
              placeholder="e.g. Di rekening non PT Mandiri"
              {...register("note")}
              rows={2}
              className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border-custom">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Record Payment</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
