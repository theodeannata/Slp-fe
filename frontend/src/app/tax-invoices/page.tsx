"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import {
  FileSpreadsheet,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PendingSaleSummary {
  no_sj_inv: string;
  tgl: string;
  masa_pajak?: number | null;
  tahun_pajak?: number | null;
  customer_id?: string | null;
  customer: string;
  npwp?: string | null;
  item_count: number;
  total_dpp: number;
  total_ppn: number;
  total_include: number;
  catatan?: string | null;
  tax_status?: "not_created" | "created";
}

const MONTHS = [
  { num: 1, label: "Jan" },
  { num: 2, label: "Feb" },
  { num: 3, label: "Mar" },
  { num: 4, label: "Apr" },
  { num: 5, label: "Mei" },
  { num: 6, label: "Jun" },
  { num: 7, label: "Jul" },
  { num: 8, label: "Agu" },
  { num: 9, label: "Sep" },
  { num: 10, label: "Okt" },
  { num: 11, label: "Nov" },
  { num: 12, label: "Des" },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function TaxInvoicesPage() {
  const { formatCurrency } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [sales, setSales] = useState<PendingSaleSummary[]>([]);
  const [selectedInvs, setSelectedInvs] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "not_created" | "created">("ALL");

  // Inline Catatan tagging
  const [editingCatatanInv, setEditingCatatanInv] = useState<string | null>(null);
  const [editingCatatanVal, setEditingCatatanVal] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.taxInvoices.pendingSales({
        year: year || undefined,
        npwp_only: true,
      });
      setSales(res || []);
    } catch (err: any) {
      setError(err.message || "Failed to load NPWP sales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year]);

  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    sales.forEach((s) => {
      if (s.masa_pajak) counts[s.masa_pajak] = (counts[s.masa_pajak] || 0) + 1;
    });
    return counts;
  }, [sales]);

  const filteredSales = useMemo(() => {
    const q = search.toLowerCase();
    return sales.filter((s) => {
      if (selectedMonth !== null && s.masa_pajak !== selectedMonth) return false;
      if (statusFilter !== "ALL" && (s.tax_status || "not_created") !== statusFilter) return false;
      if (!q) return true;
      return (
        (s.no_sj_inv || "").toLowerCase().includes(q) ||
        (s.customer || "").toLowerCase().includes(q) ||
        (s.npwp || "").toLowerCase().includes(q) ||
        (s.catatan || "").toLowerCase().includes(q)
      );
    });
  }, [sales, search, selectedMonth, statusFilter]);

  const notCreatedInView = useMemo(
    () => filteredSales.filter((s) => (s.tax_status || "not_created") === "not_created"),
    [filteredSales]
  );

  const toggleSelect = (invNo: string) => {
    setSelectedInvs((prev) =>
      prev.includes(invNo) ? prev.filter((x) => x !== invNo) : [...prev, invNo]
    );
  };

  const toggleAll = () => {
    if (selectedInvs.length === filteredSales.length) {
      setSelectedInvs([]);
    } else {
      setSelectedInvs(filteredSales.map((s) => s.no_sj_inv));
    }
  };

  const selectAllNotCreated = () => {
    setSelectedInvs(notCreatedInView.map((s) => s.no_sj_inv));
  };

  const handleExport = async (format: "xlsx" | "xml") => {
    if (selectedInvs.length === 0) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const blob =
        format === "xlsx"
          ? await api.taxInvoices.exportXlsx({ invoice_numbers: selectedInvs })
          : await api.taxInvoices.exportXml({ invoice_numbers: selectedInvs });
      downloadBlob(blob, `Coretax_Faktur_Pajak.${format}`);
      setSuccess(`Exported ${selectedInvs.length} invoice(s) to Coretax .${format.toUpperCase()}.`);
    } catch (err: any) {
      setError(err.message || `Failed to export .${format}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCatatan = async (noSjInv: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.taxInvoices.tagCatatan(noSjInv, editingCatatanVal.trim());
      setSales((prev) =>
        prev.map((item) =>
          item.no_sj_inv === noSjInv
            ? {
                ...item,
                catatan: res.catatan,
                tax_status: res.catatan ? "created" : "not_created",
              }
            : item
        )
      );
      setEditingCatatanInv(null);
      setEditingCatatanVal("");
      setSuccess(`Updated catatan for ${noSjInv}.`);
    } catch (err: any) {
      setError(err.message || "Failed to update catatan.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-custom pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Tax Invoices (Faktur Pajak Coretax)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Filter NPWP sales by month &amp; catatan status, tag issued tax invoice numbers, and export Coretax .XLSX / .XML.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-medium h-8 px-3">
            NPWP Customers Only
          </Badge>
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setSelectedMonth(null);
              setSelectedInvs([]);
            }}
            className="h-8 px-2.5 rounded-lg border border-border-custom bg-card-bg text-xs font-semibold"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="">All Years</option>
          </select>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
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
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Month Period Divider Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-border-custom bg-card-bg/60">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
          Period:
        </span>
        <Button
          size="sm"
          variant={selectedMonth === null ? "default" : "ghost"}
          onClick={() => setSelectedMonth(null)}
          className="h-7 px-2.5 text-xs"
        >
          All ({sales.length})
        </Button>
        {MONTHS.map((m) => {
          const count = monthCounts[m.num] || 0;
          const isActive = selectedMonth === m.num;
          return (
            <Button
              key={m.num}
              size="sm"
              variant={isActive ? "default" : "ghost"}
              onClick={() => setSelectedMonth(isActive ? null : m.num)}
              className={`h-7 px-2.5 text-xs ${count === 0 && !isActive ? "opacity-45" : ""}`}
            >
              {m.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-slate-200 dark:bg-zinc-800 text-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Main Card: Note Filter + Export Buttons + Table */}
      <Card>
        <CardHeader className="pb-4 border-b border-border-custom flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search invoice, customer, NPWP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "not_created" | "created")}
              className="h-8 px-2.5 rounded-lg border border-border-custom bg-card-bg text-xs"
            >
              <option value="ALL">All Status</option>
              <option value="not_created">Not Created (Recommended)</option>
              <option value="created">Already Tagged (Created)</option>
            </select>
            <Button
              size="sm"
              variant="secondary"
              disabled={notCreatedInView.length === 0}
              onClick={selectAllNotCreated}
              className="h-8 text-xs"
            >
              Select Not Created ({notCreatedInView.length})
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selectedInvs.length === 0 || actionLoading}
              onClick={() => handleExport("xlsx")}
              className="h-8 text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Export Coretax .XLSX ({selectedInvs.length})
            </Button>
            <Button
              size="sm"
              disabled={selectedInvs.length === 0 || actionLoading}
              onClick={() => handleExport("xml")}
              className="h-8 text-xs"
            >
              <FileCode2 className="w-3.5 h-3.5 mr-1.5" />
              Export Coretax .XML ({selectedInvs.length})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-slate-50/70 dark:bg-zinc-900/50 text-muted-foreground uppercase text-[10px]">
                  <th className="py-2.5 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={filteredSales.length > 0 && selectedInvs.length === filteredSales.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">NPWP / NIK</th>
                  <th className="py-2.5 px-3">Status / Catatan</th>
                  <th className="py-2.5 px-3 text-right">Items</th>
                  <th className="py-2.5 px-3 text-right">DPP</th>
                  <th className="py-2.5 px-3 text-right">PPN</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-muted-foreground">
                      {loading ? "Loading NPWP sales..." : "No NPWP sales found for this filter."}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.no_sj_inv} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40">
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={selectedInvs.includes(s.no_sj_inv)}
                          onChange={() => toggleSelect(s.no_sj_inv)}
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono">{s.tgl}</td>
                      <td className="py-2.5 px-3 font-semibold font-mono">{s.no_sj_inv}</td>
                      <td className="py-2.5 px-3">{s.customer}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{s.npwp || "-"}</td>
                      <td className="py-2.5 px-3">
                        {editingCatatanInv === s.no_sj_inv ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingCatatanVal}
                              onChange={(e) => setEditingCatatanVal(e.target.value)}
                              placeholder="040026..."
                              className="h-7 w-40 text-[11px] font-mono px-2"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              disabled={actionLoading}
                              onClick={() => handleSaveCatatan(s.no_sj_inv)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1.5 text-[11px]"
                              onClick={() => {
                                setEditingCatatanInv(null);
                                setEditingCatatanVal("");
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (s.tax_status || "not_created") === "not_created" ? (
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              Not Created (Recommended)
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => {
                                setEditingCatatanInv(s.no_sj_inv);
                                setEditingCatatanVal(s.catatan || "");
                              }}
                            >
                              + Tag Nomor
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="flex flex-col gap-0.5">
                              <Badge className="w-fit bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                Created
                              </Badge>
                              <span className="text-[10px] font-mono text-muted-foreground">{s.catatan}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 text-[10px] text-muted-foreground"
                              onClick={() => {
                                setEditingCatatanInv(s.no_sj_inv);
                                setEditingCatatanVal(s.catatan || "");
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">{s.item_count}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(s.total_dpp)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-primary">{formatCurrency(s.total_ppn)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">{formatCurrency(s.total_include)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
