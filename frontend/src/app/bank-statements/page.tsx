"use client";

import { useEffect, useState } from "react";
import { useAppStore, BankStatement, Sale } from "@/lib/store";
import { api } from "@/lib/api";
import { Modal } from "@/components/Modal";
import { useTranslation } from "@/lib/i18n";
import { useForm } from "react-hook-form";
import {
  CreditCard,
  Plus,
  Upload,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Zap,
  Link as LinkIcon,
  Unlink,
  FileText,
  FileSpreadsheet,
  UploadCloud,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BankStatementsPage() {
  const { t, formatCurrency } = useTranslation();
  const { isMockMode, sales } = useAppStore();
  const [data, setData] = useState<BankStatement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter States
  const [periodMonth, setPeriodMonth] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [manualMatchModalOpen, setManualMatchModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [autoMatchOnUpload, setAutoMatchOnUpload] = useState<boolean>(false);

  // Manual & Batch Assigning State
  const [selectedBankRowIds, setSelectedBankRowIds] = useState<string[]>([]);
  const [selectedBankRows, setSelectedBankRows] = useState<BankStatement[]>([]);
  const [salesSearch, setSalesSearch] = useState<string>("");
  const [salesList, setSalesList] = useState<Sale[]>(sales);
  const [selectedSales, setSelectedSales] = useState<Sale[]>([]);
  const [allocationsMap, setAllocationsMap] = useState<Record<string, number>>({});

  const { register, handleSubmit, reset } = useForm<Partial<BankStatement>>();

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const records: BankStatement[] = await api.bankStatements.list(periodMonth);
      setData(records);
    } catch (err: any) {
      setError(err.message || "Failed to load bank statement records.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSales = async () => {
    try {
      if (api.sales && api.sales.list) {
        const fetchedSales = await api.sales.list();
        setSalesList(fetchedSales);
      }
    } catch (err) {
      console.warn("Could not load sales for assignment modal:", err);
    }
  };

  useEffect(() => {
    loadData();
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonth, isMockMode]);

  const formatRupiah = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleCellChange = (id: string, field: keyof BankStatement, value: any) => {
    setData((prevData) =>
      prevData.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          if (field === "masuk" || field === "keluar") {
            updated[field] = value ? Number(value) : null;
          }
          return updated;
        }
        return row;
      })
    );
  };

  const handleSaveRow = async (row: BankStatement) => {
    try {
      await api.bankStatements.update(row.id, {
        tanggal: row.tanggal,
        keterangan: row.keterangan,
        masuk: row.masuk,
        keluar: row.keluar,
        account: row.account,
        no_invoice: row.no_invoice,
      });
      setSuccess(`Updated bank transaction for ${row.tanggal}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update record.");
    }
  };

  const handleDeleteRow = async (id: string) => {
    if (!confirm("Are you sure you want to delete this statement entry?")) return;
    try {
      await api.bankStatements.delete(id);
      setData((prev) => prev.filter((r) => r.id !== id));
      setSuccess("Record deleted successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete record.");
    }
  };

  // Auto-Match Action
  const handleAutoReconcile = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.bankStatements.autoReconcile(periodMonth);
      setSuccess(`Automated matching complete! Matched ${res.matched_count || 0} invoices.`);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed automated matching.");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Multi-Payment / Multi-Invoice Assignment Modal
  const openMatchModal = (bankRowsToMatch: BankStatement[]) => {
    setSelectedBankRows(bankRowsToMatch);
    setSelectedSales([]);
    setAllocationsMap({});
    setSalesSearch("");

    // Auto search sales if memo contains 3-4 digit code in first selected row
    if (bankRowsToMatch.length > 0 && bankRowsToMatch[0].keterangan) {
      const match = bankRowsToMatch[0].keterangan.match(/\b0?\d{3,4}\b/);
      if (match) {
        setSalesSearch(match[0]);
      }
    }
    setManualMatchModalOpen(true);
  };

  // Toggle invoice selection in modal
  const toggleSaleSelection = (sale: Sale) => {
    setSelectedSales((prev) => {
      const exists = prev.some((s) => s.kode_unik === sale.kode_unik);
      if (exists) {
        const next = prev.filter((s) => s.kode_unik !== sale.kode_unik);
        setAllocationsMap((alloc) => {
          const updated = { ...alloc };
          delete updated[sale.kode_unik];
          return updated;
        });
        return next;
      } else {
        const next = [...prev, sale];
        // Calculate remaining funds for default allocation
        const totalFunds = selectedBankRows.reduce((sum, b) => sum + (b.masuk || 0), 0);
        const currentAllocated = Object.values(allocationsMap).reduce((a, b) => a + b, 0);
        const defaultAmt = Math.max(0, Math.min(totalFunds - currentAllocated, sale.sisa || 0));

        setAllocationsMap((alloc) => ({
          ...alloc,
          [sale.kode_unik]: defaultAmt,
        }));
        return next;
      }
    });
  };

  // Auto-distribute payment funds sequentially across selected invoices
  const handleAutoDistributeFunds = () => {
    const totalFunds = selectedBankRows.reduce((sum, b) => sum + (b.masuk || 0), 0);
    let remaining = totalFunds;
    const newAlloc: Record<string, number> = {};

    for (const sale of selectedSales) {
      const needed = sale.sisa || 0;
      const give = Math.min(remaining, needed);
      newAlloc[sale.kode_unik] = give;
      remaining = Math.max(0, remaining - give);
    }
    setAllocationsMap(newAlloc);
  };

  // Submit N:M Batch Assignment
  const handleConfirmBatchMatch = async () => {
    if (selectedBankRows.length === 0 || selectedSales.length === 0) return;
    setActionLoading(true);
    setError(null);

    try {
      const payloadAllocations: Array<{ bank_pt_id: string; penjualan_kode_unik: string; allocated_amount: number }> = [];

      for (const bankRow of selectedBankRows) {
        for (const sale of selectedSales) {
          const allocAmt = allocationsMap[sale.kode_unik] || 0;
          if (allocAmt > 0) {
            // Split payment proportionally if multiple bank payments are selected
            const bankPortion = allocAmt / selectedBankRows.length;
            payloadAllocations.push({
              bank_pt_id: bankRow.id,
              penjualan_kode_unik: sale.kode_unik,
              allocated_amount: bankPortion,
            });
          }
        }
      }

      if (payloadAllocations.length === 0) {
        setError("Please allocate at least some funds (> IDR 0) to selected invoices.");
        setActionLoading(false);
        return;
      }

      await api.bankStatements.batchMatch(payloadAllocations);
      setSuccess(`Matched ${selectedBankRows.length} payment entry(ies) across ${selectedSales.length} sales invoice(s)!`);
      setManualMatchModalOpen(false);
      setSelectedBankRowIds([]);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to assign payment.");
    } finally {
      setActionLoading(false);
    }
  };

  // Unlink Payment
  const handleUnmatch = async (row: BankStatement) => {
    if (!confirm(`Unlink invoice ${row.no_invoice} from this bank payment?`)) return;
    try {
      await api.bankStatements.unmatch(row.id);
      setSuccess("Unlinked invoice assignment successfully.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to unlink payment.");
    }
  };

  const handleAddSubmit = async (formData: Partial<BankStatement>) => {
    setActionLoading(true);
    setError(null);
    try {
      formData.period_month = periodMonth === "ALL" ? "2026-06" : periodMonth;
      formData.masuk = formData.masuk ? Number(formData.masuk) : null;
      formData.keluar = formData.keluar ? Number(formData.keluar) : null;

      await api.bankStatements.create(formData);
      setSuccess("New bank entry created.");
      setAddModalOpen(false);
      reset();
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create entry.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setActionLoading(true);
    setError(null);
    try {
      const pMonth = periodMonth === "ALL" ? "2026-07" : periodMonth;
      const res = await api.bankStatements.upload(uploadFile, pMonth, autoMatchOnUpload);
      if (autoMatchOnUpload) {
        setSuccess(`Uploaded ${res.length || 0} entries from ${uploadFile.name} & auto-matched sales invoices!`);
      } else {
        setSuccess(`Successfully ingested ${res.length || 0} statement entries from ${uploadFile.name} into Bank PT ledger!`);
      }
      setUploadModalOpen(false);
      setUploadFile(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to upload bank statement file.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered rows & KPIs
  const filteredData = data.filter((row) => {
    const matchCat =
      categoryFilter === "ALL" ||
      (row.account || "").toUpperCase() === categoryFilter.toUpperCase();
    const matchSearch =
      !searchQuery ||
      (row.keterangan || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.no_invoice || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredSales = salesList.filter((s) => {
    if (!salesSearch) return true;
    const q = salesSearch.toLowerCase();
    return (
      (s.kode_unik && s.kode_unik.toLowerCase().includes(q)) ||
      (s.no_sj_inv && s.no_sj_inv.toLowerCase().includes(q)) ||
      (s.customer && s.customer.toLowerCase().includes(q))
    );
  });

  const totalInflow = data.reduce((acc, r) => acc + (r.masuk || 0), 0);
  const totalOutflow = data.reduce((acc, r) => acc + (r.keluar || 0), 0);
  const latestSaldo = data.length > 0 ? data[data.length - 1].saldo || 0 : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t.bankStatements.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t.bankStatements.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="h-9 px-3 py-1 bg-background text-foreground border border-input rounded-md text-sm font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Statement Periods (1,462 Rows)</option>
            <option value="2026-12">Period: 2026-12 (BCAPT1226)</option>
            <option value="2026-11">Period: 2026-11 (BCAPT1126)</option>
            <option value="2026-10">Period: 2026-10 (BCAPT1026)</option>
            <option value="2026-09">Period: 2026-09 (BCAPT0926)</option>
            <option value="2026-08">Period: 2026-08 (BCAPT0826)</option>
            <option value="2026-07">Period: 2026-07 (BCAPT0726)</option>
            <option value="2026-06">Period: 2026-06 (BCAPT0626)</option>
            <option value="2026-05">Period: 2026-05 (BCAPT0526)</option>
            <option value="2026-04">Period: 2026-04 (BCAPT0426)</option>
            <option value="2026-03">Period: 2026-03 (BCAPT0326)</option>
            <option value="2026-02">Period: 2026-02 (BCAPT0226)</option>
            <option value="2026-01">Period: 2026-01 (BCAPT0126)</option>
            <option value="2025-12">Period: 2025-12 (BCAPT1225)</option>
            <option value="2025-11">Period: 2025-11 (BCAPT1125)</option>
            <option value="2025-10">Period: 2025-10 (BCAPT1025)</option>
            <option value="2025-09">Period: 2025-09 (BCAPT0925)</option>
            <option value="2025-08">Period: 2025-08 (BCAPT0825)</option>
          </select>

          <Button
            onClick={handleAutoReconcile}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            title="Automate matching for all unmatched entries"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-300" />}
            Auto Match All
          </Button>

          <Button
            variant="outline"
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> {t.bankStatements.uploadStatement}
          </Button>

          {selectedBankRowIds.length > 0 && (
            <Button
              onClick={() => {
                const rows = data.filter((r) => selectedBankRowIds.includes(r.id));
                openMatchModal(rows);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white animate-pulse"
            >
              <LinkIcon className="w-4 h-4" />
              Batch Match ({selectedBankRowIds.length})
            </Button>
          )}

          <Button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {t.common.add}
          </Button>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Inflow (MASUK)</p>
            <p className="text-xl font-bold text-emerald-500 mt-1">{formatRupiah(totalInflow)}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Outflow (KELUAR)</p>
            <p className="text-xl font-bold text-rose-500 mt-1">{formatRupiah(totalOutflow)}</p>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ending Balance (SALDO)</p>
            <p className="text-xl font-bold text-blue-500 mt-1">{formatRupiah(latestSaldo)}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtered Entries</p>
            <p className="text-xl font-bold text-foreground mt-1">{filteredData.length} / {data.length} rows</p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {["ALL", "AR", "AP", "Biaya", "Biaya PS", "CB", "Komisi"].map((cat) => {
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                  isActive
                    ? "bg-slate-950 dark:bg-black text-white border-2 border-primary ring-2 ring-primary/30 scale-105"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted font-semibold"
                }`}
              >
                {cat === "ALL" ? "All Accounts" : cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.bankStatements.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Editable Table Container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>{t.common.loading}</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {t.common.noMatchingRecords}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredData.filter((r) => r.masuk && r.masuk > 0).length > 0 &&
                        filteredData
                          .filter((r) => r.masuk && r.masuk > 0)
                          .every((r) => selectedBankRowIds.includes(r.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const creditIds = filteredData.filter((r) => r.masuk && r.masuk > 0).map((r) => r.id);
                          setSelectedBankRowIds(creditIds);
                        } else {
                          setSelectedBankRowIds([]);
                        }
                      }}
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5 w-36">{t.bankStatements.transactionDate}</th>
                  <th className="p-3.5">{t.bankStatements.description}</th>
                  <th className="p-3.5 w-40 text-right">{t.bankStatements.credit}</th>
                  <th className="p-3.5 w-40 text-right">{t.bankStatements.debit}</th>
                  <th className="p-3.5 w-36">ACCOUNT</th>
                  <th className="p-3.5 w-44 text-right">SALDO</th>
                  <th className="p-3.5 w-44">{t.bankStatements.reconciliationStatus}</th>
                  <th className="p-3.5 w-28 text-center">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2 text-center">
                      {row.masuk && row.masuk > 0 ? (
                        <input
                          type="checkbox"
                          checked={selectedBankRowIds.includes(row.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBankRowIds((prev) => [...prev, row.id]);
                            } else {
                              setSelectedBankRowIds((prev) => prev.filter((id) => id !== row.id));
                            }
                          }}
                          className="w-4 h-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                        />
                      ) : null}
                    </td>
                    <td className="p-2">
                      <input
                        type="date"
                        value={row.tanggal || ""}
                        onChange={(e) => handleCellChange(row.id, "tanggal", e.target.value)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.keterangan || ""}
                        onChange={(e) => handleCellChange(row.id, "keterangan", e.target.value)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={row.masuk || ""}
                        placeholder="0"
                        onChange={(e) => handleCellChange(row.id, "masuk", e.target.value)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs font-bold text-right text-emerald-500 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={row.keluar || ""}
                        placeholder="0"
                        onChange={(e) => handleCellChange(row.id, "keluar", e.target.value)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs font-bold text-right text-rose-500 dark:text-rose-400 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={row.account || "AR"}
                        onChange={(e) => handleCellChange(row.id, "account", e.target.value)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="AR">AR (Sales)</option>
                        <option value="AP">AP (Purchases)</option>
                        <option value="Biaya">Biaya</option>
                        <option value="Biaya PS">Biaya PS</option>
                        <option value="CB">CB (Payroll)</option>
                        <option value="Komisi">Komisi</option>
                      </select>
                    </td>
                    <td className="p-3 text-right font-bold text-blue-500 text-xs">
                      {formatRupiah(row.saldo)}
                    </td>
                    <td className="p-3">
                      {row.no_invoice ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20">
                            {row.no_invoice}
                          </span>
                          <button
                            onClick={() => handleUnmatch(row)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            title="Unlink Payment Assignment"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : row.masuk && row.masuk > 0 ? (
                        <button
                          onClick={() => openMatchModal([row])}
                          className="p-1.5 text-emerald-600 hover:text-emerald-500 font-semibold flex items-center gap-1 transition-colors"
                          title="Assign to Sales Invoice(s)"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleSaveRow(row)}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          title="Save inline changes"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Multi-Payment & Multi-Invoice Manual Assignment Modal */}
      <Modal
        isOpen={manualMatchModalOpen}
        onClose={() => setManualMatchModalOpen(false)}
        title="Multi-Payment & Multi-Invoice Matching Matrix (N:M)"
      >
        <div className="space-y-4">
          {/* Selected Bank Payments Overview */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Selected Bank Payment Pool ({selectedBankRows.length} Entry/Entries)</span>
              <span className="text-emerald-500 text-sm font-extrabold">
                Total Funds: {formatRupiah(selectedBankRows.reduce((a, b) => a + (b.masuk || 0), 0))}
              </span>
            </div>

            <div className="max-h-28 overflow-y-auto space-y-1 divide-y divide-border/40">
              {selectedBankRows.map((b) => (
                <div key={b.id} className="pt-1 flex justify-between items-center text-[11px]">
                  <span className="font-mono text-muted-foreground truncate">{b.tanggal} — {b.keterangan}</span>
                  <span className="font-bold text-emerald-500 shrink-0 ml-2">+ {formatRupiah(b.masuk)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Search & Multi-Select Invoices */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-foreground">
                Search & Select Target Invoices (`penjualan`)
              </label>
              {selectedSales.length > 0 && (
                <button
                  type="button"
                  onClick={handleAutoDistributeFunds}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-400" /> Auto-Distribute Funds
                </button>
              )}
            </div>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Type customer name or invoice code (e.g. 0207)..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium"
              />
            </div>

            <div className="max-h-44 overflow-y-auto border border-border rounded-xl divide-y divide-border">
              {filteredSales.map((s) => {
                const isSelected = selectedSales.some((sel) => sel.kode_unik === s.kode_unik);
                return (
                  <div
                    key={s.kode_unik}
                    onClick={() => toggleSaleSelection(s)}
                    className={`p-2.5 text-xs cursor-pointer hover:bg-muted/40 transition-colors flex justify-between items-center ${
                      isSelected ? "bg-primary/15 border-l-4 border-primary font-bold" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by div onClick
                        className="w-4 h-4 text-primary rounded border-border focus:ring-primary pointer-events-none"
                      />
                      <div>
                        <p className="font-mono text-primary font-bold">{s.kode_unik}</p>
                        <p className="text-muted-foreground text-[11px]">{s.customer}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-500">{formatRupiah(s.sisa)} balance</p>
                      <p className="text-[10px] text-muted-foreground">Total: {formatRupiah(s.total_include)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allocation Matrix Table */}
          {selectedSales.length > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-primary flex items-center justify-between">
                <span>Allocation Matrix ({selectedSales.length} Selected Invoice/s)</span>
                <span className="text-[11px] text-muted-foreground">Adjust amounts per invoice</span>
              </h4>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedSales.map((s) => (
                  <div key={s.kode_unik} className="flex justify-between items-center text-xs bg-background p-2 border border-border rounded-lg">
                    <div className="truncate pr-2">
                      <p className="font-bold font-mono text-foreground truncate">{s.kode_unik}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.customer}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-amber-500 font-semibold">Bal: {formatRupiah(s.sisa)}</span>
                      <input
                        type="number"
                        value={allocationsMap[s.kode_unik] ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAllocationsMap((prev) => ({
                            ...prev,
                            [s.kode_unik]: val,
                          }));
                        }}
                        className="w-32 px-2 py-1 bg-background border border-border rounded-lg text-right font-bold text-emerald-500 text-xs focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Fund Summary Bar */}
              {(() => {
                const totalFunds = selectedBankRows.reduce((sum, b) => sum + (b.masuk || 0), 0);
                const totalAllocated = Object.values(allocationsMap).reduce((a, b) => a + b, 0);
                const remaining = totalFunds - totalAllocated;
                const isOverAllocated = remaining < -0.01;

                return (
                  <div className="pt-2 border-t border-primary/20 flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Summary:</span>
                    <div className="flex gap-3 text-[11px]">
                      <span className="text-foreground">Allocated: {formatRupiah(totalAllocated)}</span>
                      <span className={isOverAllocated ? "text-destructive font-extrabold" : "text-emerald-500"}>
                        {isOverAllocated ? `Over by ${formatRupiah(Math.abs(remaining))}` : `Unallocated: ${formatRupiah(remaining)}`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setManualMatchModalOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedSales.length === 0 || actionLoading}
              onClick={handleConfirmBatchMatch}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50 shadow-md"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Batch Assignment
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Row Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Manual Statement Entry">
        <form onSubmit={handleSubmit(handleAddSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Transaction Date</label>
            <input
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              {...register("tanggal", { required: true })}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Description / Memo</label>
            <input
              type="text"
              placeholder="e.g. SLP/INV/0426/0207 SORIN MAHARASA PT"
              {...register("keterangan", { required: true })}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Masuk (Inflow CR)</label>
              <input
                type="number"
                placeholder="0"
                {...register("masuk")}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Keluar (Outflow DB)</label>
              <input
                type="number"
                placeholder="0"
                {...register("keluar")}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Account Category</label>
            <select {...register("account")} className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm">
              <option value="AR">AR (Account Receivable / Sales)</option>
              <option value="AP">AP (Account Payable / Purchases)</option>
              <option value="Biaya">Biaya (Operational Expenses)</option>
              <option value="Biaya PS">Biaya PS (Shareholder / Admin Fees)</option>
              <option value="CB">CB (Cash Bank / Payroll)</option>
              <option value="Komisi">Komisi (Commissions)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Entry
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Statement File Modal */}
      <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload E-Banking Statement (CSV / XLSX)">
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          <div className="flex items-center gap-2 p-3 bg-muted/40 border border-border rounded-xl">
            <FileText className="w-5 h-5 text-blue-500 shrink-0" />
            <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="text-xs text-muted-foreground">
              Supports standard BCA KlikBCA CSV exports (`CorpAcctTrxn.csv`) & Bank PT Excel files (`BANKPT.xlsx`).
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Target Statement Period</label>
            <select
              value={periodMonth === "ALL" ? "2026-07" : periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary"
            >
              <option value="2026-07">Period: 2026-07 (BCAPT0726 - July 2026)</option>
              <option value="2026-08">Period: 2026-08 (BCAPT0826 - August 2026)</option>
              <option value="2026-06">Period: 2026-06 (BCAPT0626 - June 2026)</option>
              <option value="2026-05">Period: 2026-05 (BCAPT0526)</option>
              <option value="2026-04">Period: 2026-04 (BCAPT0426)</option>
              <option value="2026-03">Period: 2026-03 (BCAPT0326)</option>
              <option value="2026-02">Period: 2026-02 (BCAPT0226)</option>
              <option value="2026-01">Period: 2026-01 (BCAPT0126)</option>
              <option value="2025-12">Period: 2025-12 (BCAPT1225)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Select Statement File (.csv, .xlsx)</label>
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              required
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full p-2 bg-background border border-border rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary/90"
            />
            {uploadFile && (
              <div className="mt-2 flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                <span className="font-semibold text-foreground truncate">{uploadFile.name}</span>
                <span className="px-2 py-0.5 bg-primary/20 text-primary font-bold rounded uppercase">
                  {uploadFile.name.split('.').pop()}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoMatchOnUpload}
                onChange={(e) => setAutoMatchOnUpload(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
              />
              <span className="text-xs font-semibold text-foreground">
                Automatically match open sales invoices upon upload
              </span>
            </label>
            <p className="text-[11px] text-muted-foreground ml-6 mt-0.5">
              Unchecked by default to allow pure statement ingestion without altering invoice balances.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!uploadFile || actionLoading}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 shadow-md transition-colors"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 text-white" />}
              Ingest Statement File
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
