"use client";

import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  ShoppingBag,
  CreditCard,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  FileText,
  Printer,
  ShieldAlert,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const {
    sales,
    customers,
    products,
    payments,
    isMockMode,
    role,
    triggerMigration,
  } = useAppStore();

  const [loadingMigration, setLoadingMigration] = useState(false);
  const [migrationFeedback, setMigrationFeedback] = useState<{
    status: "success" | "error" | null;
    message: string;
  }>({ status: null, message: "" });

  const isMaster = role === "master";
  const isPending = role !== "master" && role !== "admin";

  const totalSales = sales.reduce((acc, curr) => acc + curr.total_include, 0);
  const totalRemaining = sales.reduce((acc, curr) => acc + curr.sisa, 0);
  const totalPaid = sales.reduce((acc, curr) => acc + curr.terbayar, 0);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleMigration = async () => {
    setLoadingMigration(true);
    setMigrationFeedback({ status: null, message: "" });
    try {
      if (isMockMode) {
        await triggerMigration();
        setMigrationFeedback({
          status: "success",
          message: "Mock Ingestion complete: Seeded 142 historical items into memory cache.",
        });
      } else {
        const response = await api.migrate.trigger();
        setMigrationFeedback({
          status: "success",
          message: response.detail || "Background Excel Ingestion Task started successfully.",
        });
      }
    } catch (err: any) {
      setMigrationFeedback({
        status: "error",
        message: err.message || "Failed to trigger migration.",
      });
    } finally {
      setLoadingMigration(false);
    }
  };

  // Render pending activation state
  if (isPending) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full border border-border-custom bg-card-bg p-8 rounded-2xl shadow-sm space-y-6"
        >
          <div className="w-16 h-16 border border-border-custom rounded-2xl flex items-center justify-center mx-auto bg-slate-50 dark:bg-zinc-900 text-amber-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Access Authorization Pending</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your account has been created successfully but does not have system permissions assigned yet.
            </p>
            <p className="text-xs text-slate-450 dark:text-slate-400">
              Please contact your system administrator (Master user) to approve and assign your role.
            </p>
          </div>
          <div className="pt-4 border-t border-border-custom flex flex-col gap-2">
            <span className="text-[10px] text-slate-400 font-mono">
              User ID: {useAppStore.getState().user?.id || "N/A"}
            </span>
            <button
              onClick={() => {
                useAppStore.getState().logout();
                router.push("/login");
              }}
              className="mt-2 text-xs font-semibold text-slate-500 hover:text-foreground transition-colors cursor-pointer"
            >
              Sign out / Log in as another user
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Filter cards based on Master vs Admin
  const statCards = [
    ...(isMaster
      ? [
          {
            title: "Total Invoiced Sales",
            value: formatRupiah(totalSales),
            icon: TrendingUp,
            description: "Aggregated sales ledger totals",
          },
        ]
      : []),
    {
      title: "Active Customers",
      value: customers.length.toString(),
      icon: Users,
      description: "Partner records in database",
    },
    {
      title: "Products Catalogue",
      value: products.length.toString(),
      icon: ShoppingBag,
      description: "Unique SKUs and configurations",
    },
    ...(isMaster
      ? [
          {
            title: "Remaining Receivables",
            value: formatRupiah(totalRemaining),
            icon: CreditCard,
            description: `Out of ${formatRupiah(totalSales)} invoiced`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-custom pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isMaster ? "ERP Master Dashboard" : "ERP Invoicing Console"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            {isMaster
              ? "Financial health overview, purchase matching, and payments control."
              : "Create customer invoices, print delivery notes (SJ), and update registry."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="px-2.5 py-1 rounded-md border border-border-custom bg-card-bg text-foreground flex items-center gap-1.5 shadow-sm">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isMockMode ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            {isMockMode ? "Mock Sandbox" : "API Live"}
          </span>
          <span className="px-2.5 py-1 rounded-md border border-border-custom bg-card-bg text-foreground uppercase tracking-wider">
            Role: {role}
          </span>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isMaster ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="border border-border-custom bg-card-bg p-5 flex flex-col justify-between rounded-xl shadow-sm hover:border-zinc-400 dark:hover:border-zinc-650 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {card.title}
                  </span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    {card.value}
                  </h3>
                </div>
                <div className="p-2 border border-border-custom rounded-lg bg-slate-50 dark:bg-zinc-900 text-foreground shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border-custom text-[11px] text-slate-400 flex items-center justify-between">
                <span>{card.description}</span>
                <ArrowUpRight className="w-3 h-3 text-slate-400" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Conditional Layout: Master views Ingestion & Reconciliation, Admin views Actions */}
      {isMaster ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Excel Data Ingestion Card (Migrate) */}
            <div className="border border-border-custom bg-card-bg p-6 lg:col-span-2 flex flex-col justify-between rounded-xl shadow-sm">
              <div>
                <div className="flex items-center justify-between border-b border-border-custom pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      Data Ingestion & Migration
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Synchronize historical ledgers from Excel files into the database.
                    </p>
                  </div>
                  <Upload className="w-4 h-4 text-foreground" />
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-border-custom text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    <p className="font-semibold text-foreground mb-1">
                      Excel Background Ingestion
                    </p>
                    Triggers an asynchronous worker on the FastAPI backend. It scans the seed directory for `Ledger.xlsx` and reconciles sheet tables for customers, products, POs, and payments dynamically.
                  </div>

                  {/* Feedback messages */}
                  {migrationFeedback.status && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2
                        ${
                          migrationFeedback.status === "success"
                            ? "bg-zinc-100 dark:bg-zinc-950 text-foreground border-border-custom"
                            : "bg-red-500/10 text-accent-red border-red-500/20"
                        }`}
                    >
                      {migrationFeedback.status === "success" ? (
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <span>{migrationFeedback.message}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end">
                <button
                  onClick={handleMigration}
                  disabled={loadingMigration}
                  className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {loadingMigration ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Trigger Ingestion Data
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Ledger Reconciliation view */}
            <div className="border border-border-custom bg-card-bg p-6 flex flex-col justify-between rounded-xl shadow-sm">
              <div>
                <div className="flex items-center justify-between border-b border-border-custom pb-4 mb-4">
                  <h3 className="font-bold text-base text-foreground">
                    Reconciliation Metrics
                  </h3>
                  <CheckCircle className="w-4 h-4 text-foreground" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Collected Payments</span>
                      <span className="text-foreground">
                        {((totalPaid / (totalSales || 1)) * 105).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-zinc-900 dark:bg-zinc-50 rounded-full transition-all duration-500"
                        style={{ width: `${(totalPaid / (totalSales || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Unsettled Receivables</span>
                      <span className="text-foreground">
                        {((totalRemaining / (totalSales || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-full transition-all duration-500"
                        style={{ width: `${(totalRemaining / (totalSales || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border-custom text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Receipts Logged:</span>
                      <span className="font-medium text-foreground">
                        {payments.length} entries
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ledger Source Streams:</span>
                      <span className="font-medium text-foreground">
                        {Array.from(new Set(sales.map((s) => s.sumber))).join(", ") || "None"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-[10px] text-slate-450 leading-normal border-t border-border-custom pt-3">
                Receivables are reconciled automatically when cash receipts are bound to invoice logs.
              </div>
            </div>
          </div>

          {/* Recent Payments logs */}
          <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm">
            <h3 className="font-bold text-base text-foreground border-b border-border-custom pb-4 mb-4">
              Recent Reconciled Payments
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-border-custom">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Invoice Binding</th>
                    <th className="py-2.5 px-3 text-right">Receipt Value</th>
                    <th className="py-2.5 px-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom text-foreground">
                  {payments.slice(0, 4).map((pay, i) => (
                    <tr key={i} className="hover:bg-slate-500/5">
                      <td className="py-3 px-3">{pay.tgl_bayar}</td>
                      <td className="py-3 px-3 font-semibold">{pay.customer}</td>
                      <td className="py-3 px-3 font-mono text-zinc-500">{pay.no_invoice}</td>
                      <td className="py-3 px-3 text-right font-bold text-zinc-900 dark:text-zinc-50">
                        {formatRupiah(pay.nilai_bayar_invoice)}
                      </td>
                      <td className="py-3 px-3 text-slate-400 italic truncate max-w-[200px]">
                        {pay.note || "-"}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-450">
                        No cash receipt logs seeded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Admin-only shortcuts and instructions panel */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-650 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 border border-border-custom rounded-lg flex items-center justify-center bg-slate-50 dark:bg-zinc-900 text-foreground">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Create Sales Invoice</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log a customer sales transaction. Select products, input weight quantities, and invoice calculations will generate automatically.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/sales"
                className="w-full text-center block py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition-colors"
              >
                Go to Sales Ledger
              </Link>
            </div>
          </div>

          <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-650 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 border border-border-custom rounded-lg flex items-center justify-center bg-slate-50 dark:bg-zinc-900 text-foreground">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Print Invoices & SJ</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Render invoices, Surat Jalan (Delivery Notes), and Tanda Terima (Receipt Sheets) for shipments in pre-formatted configurations.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/invoicing"
                className="w-full text-center block py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition-colors"
              >
                Go to Print Center
              </Link>
            </div>
          </div>

          <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-650 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 border border-border-custom rounded-lg flex items-center justify-center bg-slate-50 dark:bg-zinc-900 text-foreground">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Customers Directory</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Add partner entities, configure tax details (NPWP/KTP), and manage billing addresses in the master database.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/customers"
                className="w-full text-center block py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition-colors"
              >
                Go to Customers
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
