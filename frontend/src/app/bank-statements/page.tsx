"use client";

import { useEffect, useState } from "react";
import { useAppStore, BankStatement, Sale } from "@/lib/store";
import { api } from "@/lib/api";
import { Modal } from "@/components/Modal";
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
} from "lucide-react";
import { motion } from "framer-motion";

export default function BankStatementsPage() {
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

  // Manual Assigning State
  const [selectedBankRow, setSelectedBankRow] = useState<BankStatement | null>(null);
  const [salesSearch, setSalesSearch] = useState<string>("");
  const [salesList, setSalesList] = useState<Sale[]>(sales);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [allocatedAmount, setAllocatedAmount] = useState<number>(0);

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

  // Open Manual Assign Modal
  const openManualMatchModal = (row: BankStatement) => {
    setSelectedBankRow(row);
    setAllocatedAmount(row.masuk || 0);
    setSelectedSale(null);
    setSalesSearch("");

    // Auto search sales if memo contains 3-4 digit code
    if (row.keterangan) {
      const match = row.keterangan.match(/\b0?\d{3,4}\b/);
      if (match) {
        setSalesSearch(match[0]);
      }
    }
    setManualMatchModalOpen(true);
  };

  // Submit Manual Assignment
  const handleConfirmManualMatch = async () => {
    if (!selectedBankRow || !selectedSale) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.bankStatements.match(
        selectedBankRow.id,
        selectedSale.kode_unik,
        allocatedAmount
      );
      setSuccess(`Manually matched payment to invoice ${selectedSale.kode_unik}!`);
      setManualMatchModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to match payment.");
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
      const pMonth = periodMonth === "ALL" ? "2026-06" : periodMonth;
      const res = await api.bankStatements.upload(uploadFile, pMonth);
      setSuccess(`Uploaded ${res.length || 0} statement entries from ${uploadFile.name} & auto-matched invoices!`);
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
                Editable Bank Statement Ledger
              </h1>
              <p className="text-sm text-muted-foreground">
                Automated matching & manual payment assignment for Sales Invoices (`penjualan`)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="px-4 py-2 bg-slate-900 dark:bg-black text-white border border-primary/60 rounded-xl text-sm font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
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

          <button
            onClick={handleAutoReconcile}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors shadow-md disabled:opacity-50"
            title="Automate matching for all unmatched entries"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-300" />}
            Auto Match All
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
          >
            <Upload className="w-4 h-4 text-white" /> Upload CSV/XLSX
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
          >
            <Plus className="w-4 h-4 text-white" /> Add Entry
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
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
            placeholder="Search memo or invoice..."
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
            <span>Loading statement records...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No bank statement entries match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="p-3.5 w-36">TANGGAL</th>
                  <th className="p-3.5">KETERANGAN (MEMO)</th>
                  <th className="p-3.5 w-40 text-right">MASUK (CR)</th>
                  <th className="p-3.5 w-40 text-right">KELUAR (DB)</th>
                  <th className="p-3.5 w-36">ACCOUNT</th>
                  <th className="p-3.5 w-44 text-right">SALDO (FORMULA)</th>
                  <th className="p-3.5 w-44">INVOICE MATCH</th>
                  <th className="p-3.5 w-28 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
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
                          onClick={() => openManualMatchModal(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <LinkIcon className="w-3 h-3" /> Assign
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

      {/* Manual Assignment Modal */}
      <Modal
        isOpen={manualMatchModalOpen}
        onClose={() => setManualMatchModalOpen(false)}
        title="Manual Payment Assigning to Sales Invoice"
      >
        <div className="space-y-4">
          {selectedBankRow && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Payment Date: {selectedBankRow.tanggal}</span>
                <span className="text-emerald-500 font-bold">+ {formatRupiah(selectedBankRow.masuk)}</span>
              </div>
              <p className="text-muted-foreground font-mono">{selectedBankRow.keterangan}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Search & Select Target Sales Invoice (`penjualan`)
            </label>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Type customer name or invoice code (e.g. 0207)..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border">
              {filteredSales.map((s) => (
                <div
                  key={s.kode_unik}
                  onClick={() => {
                    setSelectedSale(s);
                    setAllocatedAmount(selectedBankRow?.masuk || s.sisa);
                  }}
                  className={`p-2.5 text-xs cursor-pointer hover:bg-muted/40 transition-colors flex justify-between items-center ${
                    selectedSale?.kode_unik === s.kode_unik ? "bg-primary/20 border-l-4 border-primary font-bold" : ""
                  }`}
                >
                  <div>
                    <p className="font-mono text-primary font-semibold">{s.kode_unik}</p>
                    <p className="text-muted-foreground">{s.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-500">{formatRupiah(s.sisa)} balance</p>
                    <p className="text-[10px] text-muted-foreground">Total: {formatRupiah(s.total_include)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedSale && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs space-y-2">
              <p className="font-bold text-primary">Selected: {selectedSale.kode_unik} — {selectedSale.customer}</p>
              <div className="flex justify-between items-center">
                <label className="font-semibold text-muted-foreground">Allocated Transfer Amount (IDR):</label>
                <input
                  type="number"
                  value={allocatedAmount}
                  onChange={(e) => setAllocatedAmount(Number(e.target.value))}
                  className="w-36 px-2 py-1 bg-background border border-border rounded-lg text-right font-bold text-emerald-500"
                />
              </div>
              <div className="text-[11px] text-muted-foreground flex justify-between border-t border-primary/20 pt-2">
                <span>New Outstanding Balance:</span>
                <span className="font-bold text-foreground">
                  {formatRupiah(Math.max(0, (selectedSale.sisa || 0) - allocatedAmount))}
                </span>
              </div>
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
              disabled={!selectedSale || actionLoading}
              onClick={handleConfirmManualMatch}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Payment Assignment
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
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Statement Period</label>
            <select
              value={periodMonth === "ALL" ? "2026-07" : periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm font-semibold"
            >
              <option value="2026-12">Period: 2026-12 (BCAPT1226)</option>
              <option value="2026-11">Period: 2026-11 (BCAPT1126)</option>
              <option value="2026-10">Period: 2026-10 (BCAPT1026)</option>
              <option value="2026-09">Period: 2026-09 (BCAPT0926)</option>
              <option value="2026-08">Period: 2026-08 (BCAPT0826)</option>
              <option value="2026-07">Period: 2026-07 (BCAPT0727 / BCAPT0726)</option>
              <option value="2026-06">Period: 2026-06 (BCAPT0626)</option>
              <option value="2026-05">Period: 2026-05 (BCAPT0526)</option>
              <option value="2026-04">Period: 2026-04 (BCAPT0426)</option>
              <option value="2026-03">Period: 2026-03 (BCAPT0326)</option>
              <option value="2026-02">Period: 2026-02 (BCAPT0226)</option>
              <option value="2026-01">Period: 2026-01 (BCAPT0126)</option>
              <option value="2025-12">Period: 2025-12 (BCAPT1225)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Select Statement File (.csv or .xlsx)</label>
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              required
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full p-2 bg-background border border-border rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Supports standard BCA e-banking download formats. Incoming credits will be automatically matched to sales invoices upon upload.
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
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 shadow-md"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload & Auto-Match
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
