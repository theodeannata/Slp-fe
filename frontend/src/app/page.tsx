"use client";

import { useAppStore, Product, Sale, Purchase } from "@/lib/store";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useState, useMemo } from "react";
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
  Save,
  AlertTriangle,
  Search,
  Scale,
  Check,
  TrendingDown,
  Info,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Calendar,
  Clock,
  ArrowRight,
  Coins,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

// Dynamic stock calculation helper
function calculateStock(
  productCode: string,
  isMockMode: boolean,
  products: Product[],
  sales: Sale[],
  purchasesPT: Purchase[],
  purchasesNonPT: Purchase[]
) {
  if (!isMockMode) {
    const prod = products.find((p) => p.kode_product === productCode);
    return prod?.calculated_stock ?? 0;
  }
  
  // In mock mode, aggregate locally from purchases and sales
  const receivedPT = (purchasesPT || [])
    .filter((p) => p.kode_barang === productCode)
    .reduce((acc, p) => acc + (p.qty_terima_kg || 0), 0);
  const receivedNonPT = (purchasesNonPT || [])
    .filter((p) => p.kode_barang === productCode)
    .reduce((acc, p) => acc + (p.qty_terima_kg || 0), 0);
  const sold = (sales || [])
    .filter((s) => s.kode_barang === productCode)
    .reduce((acc, s) => acc + (s.qty_kg || 0), 0);
    
  return receivedPT + receivedNonPT - sold;
}

export default function Dashboard() {
  const { t, formatCurrency, formatNumber, formatDate } = useTranslation();
  const router = useRouter();
  const {
    sales,
    customers,
    products,
    payments,
    purchasesPT,
    purchasesNonPT,
    isMockMode,
    role,
    triggerMigration,
    updateProduct,
  } = useAppStore();

  const [loadingMigration, setLoadingMigration] = useState(false);
  const [migrationFeedback, setMigrationFeedback] = useState<{
    status: "success" | "error" | null;
    message: string;
  }>({ status: null, message: "" });

  // UI States for stock logging (Admin)
  const [editedStocks, setEditedStocks] = useState<Record<string, number>>({});
  const [updatingStock, setUpdatingStock] = useState<Record<string, boolean>>({});
  const [stockSuccess, setStockSuccess] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  // UI States for outstanding invoices search & filter (Master)
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "overdue" | "pending">("all");
  const [customerSortBy, setCustomerSortBy] = useState<"outstanding" | "name">("outstanding");
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  const isMaster = role === "master" || role === "db_admin";
  const isPending = role !== "master" && role !== "admin" && role !== "db_admin";

  const totalSales = sales.reduce((acc, curr) => acc + curr.total_include, 0);
  const totalRemaining = sales.reduce((acc, curr) => acc + curr.sisa, 0);
  const totalPaid = sales.reduce((acc, curr) => acc + curr.terbayar, 0);

  // Helper for invoice due status days calculation
  const getDaysDiff = (dueDateStr: string) => {
    if (!dueDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // > 0 means overdue
  };

  // Master: Receivables aging buckets calculations
  const agingBuckets = useMemo(() => {
    let current = 0;
    let late1_30 = 0;
    let late31_60 = 0;
    let late61_plus = 0;

    sales
      .filter((s) => s.sisa > 0 && s.status_tempo?.toLowerCase() !== "lunas")
      .forEach((s) => {
        const days = getDaysDiff(s.jatuh_tempo);
        if (days <= 0) {
          current += s.sisa;
        } else if (days <= 30) {
          late1_30 += s.sisa;
        } else if (days <= 60) {
          late31_60 += s.sisa;
        } else {
          late61_plus += s.sisa;
        }
      });

    const total = current + late1_30 + late31_60 + late61_plus;
    return {
      current,
      late1_30,
      late31_60,
      late61_plus,
      total,
      pctCurrent: total > 0 ? (current / total) * 100 : 0,
      pct1_30: total > 0 ? (late1_30 / total) * 100 : 0,
      pct31_60: total > 0 ? (late31_60 / total) * 100 : 0,
      pct61_plus: total > 0 ? (late61_plus / total) * 100 : 0,
    };
  }, [sales]);

  // Master: Group outstanding invoices by customer and compute details
  const customerBreakdown = useMemo(() => {
    const unpaidSales = sales.filter((s) => s.sisa > 0 && s.status_tempo?.toLowerCase() !== "lunas");
    
    const groups: Record<string, typeof sales> = {};
    unpaidSales.forEach((s) => {
      const cust = s.customer || "Unknown Customer";
      if (!groups[cust]) {
        groups[cust] = [];
      }
      groups[cust].push(s);
    });

    const list = Object.keys(groups).map((custName) => {
      const invs = groups[custName];
      let totalOutstanding = 0;
      let totalOverdue = 0;
      let worstAgingDays = -999999;

      invs.forEach((inv) => {
        totalOutstanding += inv.sisa;
        const daysDiff = getDaysDiff(inv.jatuh_tempo);
        if (daysDiff > 0) {
          totalOverdue += inv.sisa;
        }
        if (daysDiff > worstAgingDays) {
          worstAgingDays = daysDiff;
        }
      });

      return {
        customerName: custName,
        totalOutstanding,
        totalOverdue,
        invoicesCount: invs.length,
        worstAgingDays,
        invoices: invs,
      };
    });

    const query = invoiceSearch.toLowerCase().trim();
    let filteredList = list;
    if (query) {
      filteredList = list.filter((c) => {
        const matchCustomer = c.customerName.toLowerCase().includes(query);
        const matchInvoice = c.invoices.some(
          (inv) =>
            inv.no_sj_inv.toLowerCase().includes(query) ||
            (inv.kode_barang && inv.kode_barang.toLowerCase().includes(query))
        );
        return matchCustomer || matchInvoice;
      });
    }

    if (invoiceFilter === "overdue") {
      filteredList = filteredList.map((c) => ({
        ...c,
        invoices: c.invoices.filter((inv) => getDaysDiff(inv.jatuh_tempo) > 0),
      })).filter((c) => c.invoices.length > 0).map((c) => {
        const totalOutstanding = c.invoices.reduce((acc, curr) => acc + curr.sisa, 0);
        return {
          ...c,
          totalOutstanding,
          totalOverdue: totalOutstanding,
          worstAgingDays: Math.max(...c.invoices.map((inv) => getDaysDiff(inv.jatuh_tempo))),
        };
      });
    } else if (invoiceFilter === "pending") {
      filteredList = filteredList.map((c) => ({
        ...c,
        invoices: c.invoices.filter((inv) => getDaysDiff(inv.jatuh_tempo) <= 0),
      })).filter((c) => c.invoices.length > 0).map((c) => {
        const totalOutstanding = c.invoices.reduce((acc, curr) => acc + curr.sisa, 0);
        return {
          ...c,
          totalOutstanding,
          totalOverdue: 0,
          worstAgingDays: Math.max(...c.invoices.map((inv) => getDaysDiff(inv.jatuh_tempo))),
        };
      });
    }

    if (customerSortBy === "name") {
      filteredList.sort((a, b) => a.customerName.localeCompare(b.customerName));
    } else {
      filteredList.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    }

    return filteredList;
  }, [sales, invoiceSearch, invoiceFilter, customerSortBy]);

  // Master: Calculate total outstanding balance
  const totalOutstandingBalance = useMemo(() => {
    return sales
      .filter((s) => s.sisa > 0 && s.status_tempo?.toLowerCase() !== "lunas")
      .reduce((acc, curr) => acc + curr.sisa, 0);
  }, [sales]);

  // Master: Calculate total critical overdue balance
  const totalOverdueBalance = useMemo(() => {
    return sales
      .filter((s) => s.sisa > 0 && s.status_tempo?.toLowerCase() !== "lunas" && getDaysDiff(s.jatuh_tempo) > 0)
      .reduce((acc, curr) => acc + curr.sisa, 0);
  }, [sales]);

  const toggleExpandCustomer = (name: string) => {
    setExpandedCustomers((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  // Visual analytics calculations reverted

  const formatRupiah = (num: number) => {
    return formatCurrency(num);
  };

  const handleStockInputChange = (code: string, value: string) => {
    setEditedStocks((prev) => ({
      ...prev,
      [code]: value === "" ? 0 : Number(value),
    }));
  };

  const getWarehouseStockValue = (product: Product) => {
    if (editedStocks[product.kode_product] !== undefined) {
      return editedStocks[product.kode_product];
    }
    return product.warehouse_stock ?? 0;
  };

  const handleUpdateStock = async (productCode: string) => {
    const value = getWarehouseStockValue(products.find((p) => p.kode_product === productCode)!);
    setUpdatingStock((prev) => ({ ...prev, [productCode]: true }));
    setStockSuccess(null);
    setStockError(null);
    try {
      if (isMockMode) {
        updateProduct(productCode, { warehouse_stock: value });
      } else {
        await api.products.update(productCode, { warehouse_stock: value });
        updateProduct(productCode, { warehouse_stock: value });
      }
      setStockSuccess(`Successfully updated stock for ${productCode} to ${value.toLocaleString("id-ID")} kg`);
      setTimeout(() => setStockSuccess(null), 4000);
    } catch (err: any) {
      setStockError(err.message || `Failed to update stock for ${productCode}`);
      setTimeout(() => setStockError(null), 5000);
    } finally {
      setUpdatingStock((prev) => ({ ...prev, [productCode]: false }));
    }
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
            title: t.dashboard.totalSales,
            value: formatCurrency(totalSales),
            icon: TrendingUp,
            description: t.dashboard.totalSales,
          },
        ]
      : []),
    {
      title: t.dashboard.activeCustomers,
      value: customers.length.toString(),
      icon: Users,
      description: t.dashboard.activeCustomers,
    },
    {
      title: t.dashboard.activeProducts,
      value: products.length.toString(),
      icon: ShoppingBag,
      description: t.dashboard.activeProducts,
    },
    ...(isMaster
      ? [
          {
            title: t.dashboard.outstandingReceivables,
            value: formatCurrency(totalRemaining),
            icon: CreditCard,
            description: `${t.dashboard.outstandingReceivables}: ${formatCurrency(totalRemaining)}`,
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
            {t.dashboard.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            {t.dashboard.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="px-2.5 py-1 rounded-md border border-border-custom bg-card-bg text-foreground flex items-center gap-1.5 shadow-sm">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isMockMode ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            {isMockMode ? t.common.mockMode : t.common.apiClient}
          </span>
          <span className="px-2.5 py-1 rounded-md border border-border-custom bg-card-bg text-foreground uppercase tracking-wider">
            {t.common.role}: {role}
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
            >
              <Card className="flex flex-col justify-between h-full hover:border-zinc-400 dark:hover:border-zinc-650 transition-colors">
                <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {card.title}
                    </span>
                    <CardTitle className="text-xl font-bold">
                      {card.value}
                    </CardTitle>
                  </div>
                  <div className="p-2 border border-border rounded-lg bg-muted text-foreground shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="pt-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>{card.description}</span>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Conditional Layout: Master views Ingestion & Reconciliation, Admin views Actions */}
      {isMaster ? (
        <>
          {/* Master View: Outstanding Invoices & Stock Level Inventory Audit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Outstanding Invoices View */}
            <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm space-y-5">
              {/* Header section with summary info and visual triggers */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-custom pb-4 gap-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-rose-500" />
                    {t.dashboard.customerOutstanding}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t.dashboard.customerOutstandingDesc}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20 font-mono">
                    {t.dashboard.outstandingReceivables}: {formatCurrency(totalOutstandingBalance)}
                  </span>
                </div>
              </div>

              {/* Receivables Aging Stacked Progress Bar */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10 border border-border-custom/80">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>{t.dashboard.receivablesAging}</span>
                  <span className="text-rose-500 font-mono font-bold">{t.dashboard.overdue}: {formatCurrency(totalOverdueBalance)}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden flex shadow-inner">
                  {agingBuckets.pctCurrent > 0 && (
                    <div
                      style={{ width: `${agingBuckets.pctCurrent}%` }}
                      className="bg-emerald-500 h-full transition-all duration-550"
                      title={`${t.dashboard.currentDue}: ${formatCurrency(agingBuckets.current)} (${agingBuckets.pctCurrent.toFixed(1)}%)`}
                    />
                  )}
                  {agingBuckets.pct1_30 > 0 && (
                    <div
                      style={{ width: `${agingBuckets.pct1_30}%` }}
                      className="bg-amber-400 h-full transition-all duration-550"
                      title={`${t.dashboard.daysLate1_30}: ${formatCurrency(agingBuckets.late1_30)} (${agingBuckets.pct1_30.toFixed(1)}%)`}
                    />
                  )}
                  {agingBuckets.pct31_60 > 0 && (
                    <div
                      style={{ width: `${agingBuckets.pct31_60}%` }}
                      className="bg-orange-500 h-full transition-all duration-550"
                      title={`${t.dashboard.daysLate31_60}: ${formatCurrency(agingBuckets.late31_60)} (${agingBuckets.pct31_60.toFixed(1)}%)`}
                    />
                  )}
                  {agingBuckets.pct61_plus > 0 && (
                    <div
                      style={{ width: `${agingBuckets.pct61_plus}%` }}
                      className="bg-rose-600 h-full transition-all duration-550"
                      title={`${t.dashboard.daysLate61Plus}: ${formatCurrency(agingBuckets.late61_plus)} (${agingBuckets.pct61_plus.toFixed(1)}%)`}
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0" />
                    <span>{t.dashboard.currentDue}: {formatCurrency(agingBuckets.current)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-400 shrink-0" />
                    <span>{t.dashboard.daysLate1_30}: {formatCurrency(agingBuckets.late1_30)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-orange-500 shrink-0" />
                    <span>{t.dashboard.daysLate31_60}: {formatCurrency(agingBuckets.late31_60)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-600 shrink-0" />
                    <span>{t.dashboard.daysLate61Plus}: {formatCurrency(agingBuckets.late61_plus)}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Search, Sort, and Filtering Row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t.dashboard.searchCustomerInvoice}
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-custom bg-card-bg text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-zinc-405"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Sorting dropdown */}
                  <select
                    value={customerSortBy}
                    onChange={(e) => setCustomerSortBy(e.target.value as any)}
                    className="px-2.5 py-2 border border-border-custom rounded-xl bg-card-bg text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-405"
                  >
                    <option value="outstanding">{t.dashboard.sortByOutstanding}</option>
                    <option value="name">{t.dashboard.sortByName}</option>
                  </select>

                  <div className="flex rounded-xl border border-border-custom bg-card-bg p-0.5 overflow-hidden">
                    {(["all", "overdue", "pending"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setInvoiceFilter(mode)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                          invoiceFilter === mode
                            ? "bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 shadow-sm"
                            : "text-slate-400 hover:text-foreground"
                        }`}
                      >
                        {mode === "all" ? t.dashboard.allInvoices : mode === "overdue" ? t.dashboard.overdueOnly : t.dashboard.pendingOnly}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Collapsible Customer outstanding invoices list */}
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                {customerBreakdown.map((cust) => {
                  const isExpanded = expandedCustomers[cust.customerName];
                  
                  // Get Worst Aging Label
                  let worstAgingLabel = t.dashboard.currentDue;
                  let badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                  if (cust.worstAgingDays > 60) {
                    worstAgingLabel = `${t.dashboard.overdue} (60+ ${t.dashboard.days})`;
                    badgeColor = "bg-red-500/10 text-rose-600 dark:text-rose-455 border-red-500/20 animate-pulse";
                  } else if (cust.worstAgingDays > 30) {
                    worstAgingLabel = `${t.dashboard.overdue} (31-60 ${t.dashboard.days})`;
                    badgeColor = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
                  } else if (cust.worstAgingDays > 0) {
                    worstAgingLabel = `${t.dashboard.overdue} (1-30 ${t.dashboard.days})`;
                    badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-455 border-amber-500/20";
                  }

                  return (
                    <div
                      key={cust.customerName}
                      className="border border-border-custom rounded-xl overflow-hidden bg-card-bg/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
                    >
                      {/* Customer Summary Bar */}
                      <div
                        onClick={() => toggleExpandCustomer(cust.customerName)}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/20 dark:bg-zinc-900/10 hover:bg-slate-50/60 dark:hover:bg-zinc-900/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border border-border-custom bg-card-bg flex items-center justify-center text-foreground font-bold shrink-0">
                            {cust.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{cust.customerName}</h4>
                            <span className="text-[10px] text-slate-400">
                              {cust.invoicesCount} unsettled invoice{cust.invoicesCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 justify-between md:justify-end">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                            {worstAgingLabel}
                          </span>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-foreground">
                              {formatRupiah(cust.totalOutstanding)}
                            </div>
                            {cust.totalOverdue > 0 && (
                              <div className="text-[9px] text-rose-500 font-semibold">
                                {t.dashboard.overdue}: {formatCurrency(cust.totalOverdue)}
                              </div>
                            )}
                          </div>
                          <div className="p-1 text-slate-400 rounded-lg hover:bg-border-custom transition-colors shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Nested Expanded Invoices List */}
                      {isExpanded && (
                        <div className="border-t border-border-custom bg-slate-500/5 p-4 space-y-3">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                              <thead>
                                <tr className="text-slate-400 font-semibold border-b border-border-custom uppercase tracking-wider text-[10px] pb-2">
                                  <th className="py-2">{t.sales.invoiceNo}</th>
                                  <th className="py-2">{t.sales.dueDate}</th>
                                  <th className="py-2 text-center">{t.sales.paymentStatus}</th>
                                  <th className="py-2 text-right">{t.sales.remainingAmount}</th>
                                  <th className="py-2 text-center">{t.common.actions}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-custom/50 text-foreground">
                                {cust.invoices.map((inv) => {
                                  const daysDiff = getDaysDiff(inv.jatuh_tempo);
                                  const isOverdue = daysDiff > 0;
                                  const pctPaid = inv.total_include > 0 ? (inv.terbayar / inv.total_include) * 100 : 0;

                                  return (
                                    <tr key={inv.kode_unik} className="hover:bg-slate-500/5 transition-colors">
                                      {/* Invoice Details */}
                                      <td className="py-2.5">
                                        <div className="font-mono font-bold text-zinc-550 dark:text-zinc-400">{inv.no_sj_inv}</div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span>{t.common.date}: {inv.tgl}</span>
                                        </div>
                                      </td>

                                      {/* Due Status */}
                                      <td className="py-2.5">
                                        <div className="text-foreground">{inv.jatuh_tempo}</div>
                                        <div className="mt-0.5 flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                          {isOverdue ? (
                                            <span className="text-[9px] font-bold text-rose-600 dark:text-rose-455">
                                              {t.dashboard.overdue} ({daysDiff} {t.dashboard.days})
                                            </span>
                                          ) : (
                                            <span className="text-[9px] font-medium text-slate-400">
                                              {t.dashboard.dueIn} {Math.abs(daysDiff)} {t.dashboard.days}
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Collection Ratio Progress Bar */}
                                      <td className="py-2.5 px-4">
                                        <div className="w-28 mx-auto space-y-1">
                                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                                            <span>{pctPaid.toFixed(0)}% {t.sales.paid}</span>
                                            <span>{formatCurrency(inv.terbayar)}</span>
                                          </div>
                                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden shadow-inner">
                                            <div
                                              style={{ width: `${pctPaid}%` }}
                                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                            />
                                          </div>
                                        </div>
                                      </td>

                                      {/* Balance Due info */}
                                      <td className="py-2.5 text-right font-medium">
                                        <div className="font-bold text-rose-500">{formatCurrency(inv.sisa)}</div>
                                        <div className="text-[9px] text-slate-400 mt-0.5">
                                          {t.common.total}: {formatCurrency(inv.total_include)}
                                        </div>
                                      </td>

                                      {/* Actions */}
                                      <td className="py-2.5 text-center">
                                        <Link
                                          href={`/payments?invoice=${encodeURIComponent(inv.no_sj_inv)}`}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-border-custom hover:border-zinc-400 rounded-lg text-[10px] font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 text-foreground transition-all cursor-pointer shadow-sm"
                                        >
                                          <Coins className="w-3 h-3 text-emerald-500" />
                                          <span>{t.sales.recordPayment}</span>
                                          <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                                        </Link>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {customerBreakdown.length === 0 && (
                  <div className="py-12 text-center text-slate-400 italic border border-dashed border-border-custom rounded-xl">
                    {t.dashboard.noOutstanding}
                  </div>
                )}
              </div>

            </div>

            {/* Inventory Stock Level Audit View */}
            <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-500" />
                  {t.dashboard.warehouseStock}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.dashboard.warehouseStockDesc}
                </p>
              </div>

              <div className="overflow-y-auto max-h-[580px] pr-1 scrollbar-thin">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-card-bg z-10">
                    <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-border-custom">
                      <th className="py-2.5 px-3">{t.common.products}</th>
                      <th className="py-2.5 px-3 text-right">{t.dashboard.calculatedStock}</th>
                      <th className="py-2.5 px-3 text-right">{t.dashboard.physicalStock}</th>
                      <th className="py-2.5 px-3 text-right">{t.common.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom text-foreground">
                    {products.map((p) => {
                      const sysStock = calculateStock(
                        p.kode_product,
                        isMockMode,
                        products,
                        sales,
                        purchasesPT,
                        purchasesNonPT
                      );
                      const currentLoggedVal = p.warehouse_stock;
                      const hasLoggedCount = currentLoggedVal !== undefined && currentLoggedVal !== null;
                      const diff = hasLoggedCount ? currentLoggedVal - sysStock : null;

                      return (
                        <tr key={p.kode_product} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold">{p.nama_product}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {p.kode_product} | {p.kemasan_kg} {p.unit}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium font-mono">
                            <div>{formatNumber(sysStock)} kg</div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              ≈ {formatNumber(Math.round(sysStock / (p.kemasan_kg || 1)))} {p.unit}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium font-mono">
                            {hasLoggedCount ? (
                              <>
                                <div>{formatNumber(currentLoggedVal)} kg</div>
                                <div className="text-[10px] text-slate-400 font-sans">
                                  ≈ {formatNumber(Math.round(currentLoggedVal / (p.kemasan_kg || 1)))} {p.unit}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold">
                            {hasLoggedCount ? (
                              diff === 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-sans">
                                  <Check className="w-3 h-3" />
                                  OK
                                </span>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                    diff! > 0 
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" 
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  }`}>
                                    {diff! > 0 ? "+" : ""}{formatNumber(diff!)} kg
                                  </span>
                                </div>
                              )
                            ) : (
                              <span className="text-slate-400 italic text-[10px] font-sans">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Admin Dashboard: Actions & Stock Logger Split View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Admin quick shortcuts */}
          <div className="space-y-4 lg:col-span-1">
            <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-650 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 border border-border-custom rounded-lg flex items-center justify-center bg-slate-50 dark:bg-zinc-900 text-foreground">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">{t.dashboard.createNewInvoice}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.sales.subtitle}
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/sales"
                  className="w-full text-center block py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition-colors"
                >
                  {t.sales.title}
                </Link>
              </div>
            </div>

            <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-650 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 border border-border-custom rounded-lg flex items-center justify-center bg-slate-50 dark:bg-zinc-900 text-foreground">
                  <Printer className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">{t.invoicing.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.invoicing.subtitle}
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/invoicing"
                  className="w-full text-center block py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition-colors"
                >
                  {t.invoicing.title}
                </Link>
              </div>
            </div>

            <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-650 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 border border-border-custom rounded-lg flex items-center justify-center bg-slate-50 dark:bg-zinc-900 text-foreground">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">{t.customers.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.customers.subtitle}
                </p>
              </div>
              <div className="mt-6">
                <Link
                  href="/customers"
                  className="w-full text-center block py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs transition-colors"
                >
                  {t.customers.title}
                </Link>
              </div>
            </div>
          </div>

          {/* Admin Stock Logger widget */}
          <div className="lg:col-span-2">
            <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-500" />
                  {t.dashboard.warehouseStock}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.dashboard.warehouseStockDesc}
                </p>
              </div>

              {stockSuccess && (
                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{t.dashboard.stockUpdated}</span>
                </div>
              )}

              {stockError && (
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-650 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{stockError}</span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-border-custom">
                      <th className="py-2.5 px-3">{t.common.products}</th>
                      <th className="py-2.5 px-3 text-right">{t.dashboard.calculatedStock}</th>
                      <th className="py-2.5 px-3 text-center">{t.dashboard.physicalStock}</th>
                      <th className="py-2.5 px-3 text-right">{t.common.status}</th>
                      <th className="py-2.5 px-3 text-center">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom text-foreground">
                    {products.map((p) => {
                      const sysStock = calculateStock(
                        p.kode_product,
                        isMockMode,
                        products,
                        sales,
                        purchasesPT,
                        purchasesNonPT
                      );
                      const currentLoggedVal = p.warehouse_stock;
                      const inputVal = getWarehouseStockValue(p);
                      const isPendingUpdate = updatingStock[p.kode_product];

                      const hasLoggedCount = currentLoggedVal !== undefined && currentLoggedVal !== null;
                      const diff = hasLoggedCount ? currentLoggedVal - sysStock : null;

                      return (
                        <tr key={p.kode_product} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold">{p.nama_product}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {p.kode_product} | {p.kemasan_kg} {p.unit}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium">
                            <div className="font-mono">{formatNumber(sysStock)} kg</div>
                            <div className="text-[10px] text-slate-400">
                              ≈ {formatNumber(Math.round(sysStock / (p.kemasan_kg || 1)))} {p.unit}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-2 max-w-[150px] mx-auto">
                              <input
                                type="number"
                                value={inputVal === 0 && editedStocks[p.kode_product] === undefined && currentLoggedVal === undefined ? "" : inputVal}
                                placeholder={hasLoggedCount ? currentLoggedVal.toString() : "kg"}
                                onChange={(e) => handleStockInputChange(p.kode_product, e.target.value)}
                                className="w-24 px-2 py-1 text-center rounded border border-border-custom bg-card-bg text-foreground focus:outline-none focus:ring-1 focus:ring-zinc-450 text-xs font-mono"
                              />
                              <span className="text-[10px] text-slate-400">kg</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold">
                            {hasLoggedCount ? (
                              diff === 0 ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <Check className="w-3 h-3" />
                                  OK
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                  diff! > 0 
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" 
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                }`}>
                                  {diff! > 0 ? "+" : ""}{formatNumber(diff!)} kg
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleUpdateStock(p.kode_product)}
                              disabled={isPendingUpdate}
                              className="p-1.5 rounded-lg border border-border-custom bg-card-bg hover:bg-slate-500/5 text-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                              title={t.common.save}
                            >
                              {isPendingUpdate ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
