"use client";

import { useAppStore, Product, Sale, Purchase } from "@/lib/store";
import { api } from "@/lib/api";
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
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

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

  const isMaster = role === "master" || role === "db_admin";
  const isPending = role !== "master" && role !== "admin" && role !== "db_admin";

  const totalSales = sales.reduce((acc, curr) => acc + curr.total_include, 0);
  const totalRemaining = sales.reduce((acc, curr) => acc + curr.sisa, 0);
  const totalPaid = sales.reduce((acc, curr) => acc + curr.terbayar, 0);

  // Master: Filter Outstanding Invoices
  const outstandingInvoices = useMemo(() => {
    return sales.filter((s) => {
      const isUnpaid = s.sisa > 0 && s.status_tempo?.toLowerCase() !== "lunas";
      if (!isUnpaid) return false;

      const query = invoiceSearch.toLowerCase();
      const matchSearch =
        s.no_sj_inv.toLowerCase().includes(query) ||
        s.customer.toLowerCase().includes(query) ||
        (s.kode_barang && s.kode_barang.toLowerCase().includes(query));
      if (!matchSearch) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(s.jatuh_tempo);
      const isInvoiceOverdue = dueDate < today;

      if (invoiceFilter === "overdue") return isInvoiceOverdue;
      if (invoiceFilter === "pending") return !isInvoiceOverdue;
      return true;
    });
  }, [sales, invoiceSearch, invoiceFilter]);

  // Master: Calculate total outstanding balance
  const totalOutstandingBalance = useMemo(() => {
    return sales
      .filter((s) => s.sisa > 0 && s.status_tempo?.toLowerCase() !== "lunas")
      .reduce((acc, curr) => acc + curr.sisa, 0);
  }, [sales]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
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
          {/* Master View: Outstanding Invoices & Stock Level Inventory Audit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Outstanding Invoices View */}
            <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-custom pb-4 gap-2">
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-rose-500" />
                    Customer Outstanding Invoices
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track invoices with remaining receivables and matching due statuses.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">
                    Outstanding: {formatRupiah(totalOutstandingBalance)}
                  </span>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoice no or customer..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-custom bg-card-bg text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-zinc-405"
                  />
                </div>
                <div className="flex rounded-xl border border-border-custom bg-card-bg p-0.5 overflow-hidden shrink-0">
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
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-card-bg z-10">
                    <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-border-custom">
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Total Include</th>
                      <th className="py-2.5 px-3 text-right text-rose-500">Remaining Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom text-foreground">
                    {outstandingInvoices.map((inv) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dueDate = new Date(inv.jatuh_tempo);
                      const isOverdue = dueDate < today;
                      
                      return (
                        <tr key={inv.kode_unik} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3 px-3 font-mono font-medium text-zinc-500">{inv.no_sj_inv}</td>
                          <td className="py-3 px-3 font-semibold">{inv.customer}</td>
                          <td className="py-3 px-3">
                            <div>{inv.jatuh_tempo}</div>
                            <div className="mt-0.5">
                              {isOverdue ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-rose-600 dark:text-rose-455 border border-red-500/20">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Overdue
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-slate-500 border border-border-custom">
                                  Pending
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">{formatRupiah(inv.total_include)}</td>
                          <td className="py-3 px-3 text-right font-bold text-rose-500">{formatRupiah(inv.sisa)}</td>
                        </tr>
                      );
                    })}
                    {outstandingInvoices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          No outstanding invoices found matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Stock Level Audit View */}
            <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-500" />
                  Inventory Stock Level Audit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitor system-calculated inventory versus physical logged stock counts.
                </p>
              </div>

              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-card-bg z-10">
                    <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-border-custom">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-right">System Stock</th>
                      <th className="py-2.5 px-3 text-right">Warehouse Logged</th>
                      <th className="py-2.5 px-3 text-right">Discrepancy</th>
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
                              Code: {p.kode_product} | Packaging: {p.kemasan_kg} {p.unit}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium font-mono">
                            <div>{sysStock.toLocaleString("id-ID")} kg</div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              ≈ {Math.round(sysStock / (p.kemasan_kg || 1)).toLocaleString("id-ID")} {p.unit}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium font-mono">
                            {hasLoggedCount ? (
                              <>
                                <div>{currentLoggedVal.toLocaleString("id-ID")} kg</div>
                                <div className="text-[10px] text-slate-400 font-sans">
                                  ≈ {Math.round(currentLoggedVal / (p.kemasan_kg || 1)).toLocaleString("id-ID")} {p.unit}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Unlogged</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold">
                            {hasLoggedCount ? (
                              diff === 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-sans">
                                  <Check className="w-3 h-3" />
                                  Matches
                                </span>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                    diff! > 0 
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" 
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  }`}>
                                    {diff! > 0 ? "+" : ""}{diff!.toLocaleString("id-ID")} kg
                                  </span>
                                  <span className="text-[9px] text-slate-400 mt-0.5 font-sans">
                                    {diff! > 0 ? "Surplus" : "Shortage"}
                                  </span>
                                </div>
                              )
                            ) : (
                              <span className="text-slate-400 italic text-[10px] font-sans">No count logged</span>
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
                <h3 className="font-bold text-base text-foreground">Create Sales Invoice</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Log customer sales. Select products, input weight quantities, and invoice calculations will generate automatically.
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
                  Render invoices, Surat Jalan (Delivery Notes), and Tanda Terima for shipments in pre-formatted configurations.
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

          {/* Admin Stock Logger widget */}
          <div className="lg:col-span-2">
            <div className="border border-border-custom bg-card-bg p-6 rounded-xl shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-500" />
                  Warehouse Stock Registry
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review calculated inventory and log actual physical warehouse stock counts.
                </p>
              </div>

              {stockSuccess && (
                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{stockSuccess}</span>
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
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-right">System Stock (Calculated)</th>
                      <th className="py-2.5 px-3 text-center">Physical Warehouse Count</th>
                      <th className="py-2.5 px-3 text-right">Discrepancy</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
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
                              Code: {p.kode_product} | Packaging: {p.kemasan_kg} {p.unit}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium">
                            <div className="font-mono">{sysStock.toLocaleString("id-ID")} kg</div>
                            <div className="text-[10px] text-slate-400">
                              ≈ {Math.round(sysStock / (p.kemasan_kg || 1)).toLocaleString("id-ID")} {p.unit}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-2 max-w-[150px] mx-auto">
                              <input
                                type="number"
                                value={inputVal === 0 && editedStocks[p.kode_product] === undefined && currentLoggedVal === undefined ? "" : inputVal}
                                placeholder={hasLoggedCount ? currentLoggedVal.toString() : "Enter kg"}
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
                                  Matches
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                  diff! > 0 
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" 
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                }`}>
                                  {diff! > 0 ? "+" : ""}{diff!.toLocaleString("id-ID")} kg
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Unlogged</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleUpdateStock(p.kode_product)}
                              disabled={isPendingUpdate}
                              className="p-1.5 rounded-lg border border-border-custom bg-card-bg hover:bg-slate-500/5 text-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                              title="Save Physical Stock"
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
