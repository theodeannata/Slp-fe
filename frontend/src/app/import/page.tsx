"use client";

import { useState } from "react";
import { useAppStore, Customer, Product, Sale, Purchase, Payment } from "@/lib/store";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import {
  Upload,
  FileSpreadsheet,
  Grid,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Database,
  Plus,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ParsedData {
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  purchasesPT: Purchase[];
  purchasesNonPT: Purchase[];
  payments: Payment[];
}

export default function ImportPage() {
  const { t } = useTranslation();
  const { isMockMode, customers, products, sales, addCustomer, addProduct, addSale, addPurchasePT, addPurchaseNonPT, addPayment } = useAppStore();

  const [activeTab, setActiveTab] = useState<"file" | "manual">("file");
  const [selectedSheetType, setSelectedSheetType] = useState<keyof ParsedData>("sales");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Parsed spreadsheet rows
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Manual entry rows (for Sales Invoices)
  const [manualRows, setManualRows] = useState<Partial<Sale>[]>([
    {
      kode_unik: "",
      no_sj_inv: "",
      tgl: new Date().toISOString().split("T")[0],
      id: "",
      customer: "",
      kode_barang: "",
      barang: "",
      qty_kg: 0,
      harga_exc: 0,
      total_include: 0,
      tempo: 30,
      jatuh_tempo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status_tempo: "Belum Lunas",
      fp: "T",
    },
  ]);

  // Handle spreadsheet file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const uploadedFile = files[0];
    setFile(uploadedFile);
    parseExcel(uploadedFile, selectedSheetType);
  };

  // Re-parse when sheet type changes
  const handleSheetTypeChange = (type: keyof ParsedData) => {
    setSelectedSheetType(type);
    if (file) {
      parseExcel(file, type);
    }
  };

  const parseExcel = (excelFile: File, type: keyof ParsedData) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0]; // read first sheet
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          throw new Error("The uploaded sheet is empty.");
        }

        // Display parsed preview rows
        setPreviewRows(json);
        setSuccess(`Loaded ${json.length} rows from "${excelFile.name}".`);
      } catch (err: any) {
        setError(err.message || "Failed to parse Excel file.");
        setPreviewRows([]);
      }
    };
    reader.readAsArrayBuffer(excelFile);
  };

  // Map parsed rows to expected models and insert into store/backend
  const handleImportSubmit = async () => {
    if (previewRows.length === 0) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    let importCount = 0;
    try {
      if (isMockMode) {
        // Mock Ingestion - Add to Zustand global arrays
        previewRows.forEach((row) => {
          if (selectedSheetType === "customers") {
            const cust: Customer = {
              customer_id: row.customer_id || row.id || `CUST-${Math.random()}`,
              customer: row.customer || row.name || "Unknown Customer",
              npwp_ktp: row.npwp_ktp || row.npwp || "",
              address: row.address || "",
              city: row.city || "",
            };
            addCustomer(cust);
          } else if (selectedSheetType === "products") {
            const prod: Product = {
              kode_product: row.kode_product || row.code || `SKU-${Math.random()}`,
              nama_product: row.nama_product || row.name || "Unknown SKU",
              kemasan_kg: Number(row.kemasan_kg) || 25,
              unit: row.unit || "SAK",
            };
            addProduct(prod);
          } else if (selectedSheetType === "sales") {
            const exc = Number(row.harga_exc) || 0;
            const inc = Number(row.harga_inc) || Math.round(exc * 1.11);
            const qty = Number(row.qty_kg) || 0;
            const subtotal = qty * inc;
            const sale: Sale = {
              kode_unik: row.kode_unik || `SLP/INV-${Math.random()}`,
              sumber: row.sumber || "2026",
              tgl: row.tgl || new Date().toISOString().split("T")[0],
              no_sj_inv: row.no_sj_inv || "",
              id: row.id || row.customer_id || "",
              customer: row.customer || "",
              no_urut: Number(row.no_urut) || 1,
              kode_barang: row.kode_barang || row.product_code || "",
              barang: row.barang || row.product_name || "",
              satuan_kemasan: Number(row.satuan_kemasan) || 25,
              qty_kg: qty,
              harga_exc: exc,
              harga_inc: inc,
              total_include: row.total_include || subtotal,
              nilai_lain: Number(row.nilai_lain) || null,
              ppn: Number(row.ppn) || null,
              tempo: Number(row.tempo) || 30,
              jatuh_tempo: row.jatuh_tempo || "",
              tgl_bayar_1: row.tgl_bayar_1 || null,
              nilai_bayar_1: Number(row.nilai_bayar_1) || null,
              sisa: Number(row.sisa) || subtotal,
              terbayar: Number(row.terbayar) || 0,
              status_tempo: row.status_tempo || "Belum Lunas",
              bagi_hasil: row.bagi_hasil || null,
              npwp: row.npwp || "",
              catatan: row.catatan || "",
              catatan2: row.catatan2 || "",
              fp: row.fp || "T",
            };
            addSale(sale);
          } else if (selectedSheetType === "purchasesPT") {
            const p: Purchase = {
              kode_unik: row.kode_unik || `PO-PT-${Math.random()}`,
              tgl_terima_barang: row.tgl_terima_barang || "",
              tgl_bayar: row.tgl_bayar || "",
              tgl_po: row.tgl_po || "",
              no_po: row.no_po || "",
              vendor: row.vendor || "",
              no_urut: Number(row.no_urut) || 1,
              kode_barang: row.kode_barang || "",
              barang: row.barang || "",
              qty_kg: Number(row.qty_kg) || 0,
              qty_terima_kg: Number(row.qty_terima_kg) || 0,
              dpp: Number(row.dpp) || 0,
              harga: Number(row.harga) || 0,
              total: Number(row.total) || 0,
              note: row.note || "",
              jual: Number(row.jual) || null,
              total_jual: Number(row.total_jual) || null,
              untung: Number(row.untung) || null,
              persen: Number(row.persen) || null,
            };
            addPurchasePT(p);
          } else if (selectedSheetType === "purchasesNonPT") {
            const p: Purchase = {
              kode_unik: row.kode_unik || `PO-NPT-${Math.random()}`,
              tgl_terima_barang: row.tgl_terima_barang || "",
              tgl_bayar: row.tgl_bayar || "",
              tgl_po: row.tgl_po || "",
              no_po: row.no_po || "",
              vendor: row.vendor || "",
              no_urut: Number(row.no_urut) || 1,
              kode_barang: row.kode_barang || "",
              barang: row.barang || "",
              qty_kg: Number(row.qty_kg) || 0,
              qty_terima_kg: Number(row.qty_terima_kg) || 0,
              dpp: Number(row.dpp) || 0,
              harga: Number(row.harga) || 0,
              total: Number(row.total) || 0,
              note: row.note || "",
              jual: Number(row.jual) || null,
              total_jual: Number(row.total_jual) || null,
              untung: Number(row.untung) || null,
              persen: Number(row.persen) || null,
              coa_halal: row.coa_halal || "Y",
            };
            addPurchaseNonPT(p);
          } else if (selectedSheetType === "payments") {
            const pay: Payment = {
              id: row.id || `PAY-${Math.random()}`,
              tgl_bayar: row.tgl_bayar || "",
              nilai_transfer: Number(row.nilai_transfer) || 0,
              no_invoice: row.no_invoice || "",
              customer: row.customer || "",
              nilai_bayar_invoice: Number(row.nilai_bayar_invoice) || 0,
              note: row.note || "",
            };
            addPayment(pay);
          }
          importCount++;
        });
      } else {
        // Live Mode - Trigger sequential uploads to the backend API gateway
        for (const row of previewRows) {
          if (selectedSheetType === "customers") {
            await api.customers.create(row);
          } else if (selectedSheetType === "products") {
            await api.products.create(row);
          } else if (selectedSheetType === "sales") {
            const { sumber, ...bodyWithoutSumber } = row;
            await api.sales.create(bodyWithoutSumber);
          } else if (selectedSheetType === "purchasesPT") {
            await api.purchases.createPT(row);
          } else if (selectedSheetType === "purchasesNonPT") {
            await api.purchases.createNonPT(row);
          } else if (selectedSheetType === "payments") {
            await api.payments.create(row);
          }
          importCount++;
        }
      }
      setSuccess(`Import complete: Successfully loaded ${importCount} records into the database!`);
      setPreviewRows([]);
      setFile(null);
    } catch (err: any) {
      setError(err.message || `Failed during batch import at row ${importCount + 1}.`);
    } finally {
      setLoading(false);
    }
  };

  // Add a new row to manual entry table
  const addManualRow = () => {
    setManualRows([
      ...manualRows,
      {
        kode_unik: "",
        no_sj_inv: "",
        tgl: new Date().toISOString().split("T")[0],
        id: customers[0]?.customer_id || "",
        customer: customers[0]?.customer || "",
        kode_barang: products[0]?.kode_product || "",
        barang: products[0]?.nama_product || "",
        qty_kg: 0,
        harga_exc: 0,
        total_include: 0,
        tempo: 30,
        jatuh_tempo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status_tempo: "Belum Lunas",
        fp: "T",
      },
    ]);
  };

  // Update specific cell in manual rows
  const handleManualRowChange = (index: number, key: keyof Sale, val: any) => {
    const updated = [...manualRows];
    updated[index] = { ...updated[index], [key]: val };

    // Auto calculate pricing on the fly
    if (key === "qty_kg" || key === "harga_exc" || key === "kode_barang" || key === "id") {
      const row = updated[index];
      // Sync Customer name
      if (key === "id") {
        const c = customers.find((cust) => cust.customer_id === val);
        if (c) row.customer = c.customer;
      }
      // Sync Product name and size
      if (key === "kode_barang") {
        const p = products.find((prod) => prod.kode_product === val);
        if (p) {
          row.barang = p.nama_product;
          row.satuan_kemasan = p.kemasan_kg;
        }
      }

      const qty = Number(row.qty_kg) || 0;
      const exc = Number(row.harga_exc) || 0;
      if (qty > 0 && exc > 0) {
        const inc = Math.round(exc * 1.11 * 100) / 100;
        row.harga_inc = inc;
        row.total_include = qty * inc;
        row.ppn = Math.round((row.total_include - qty * exc) * 100) / 100;
        row.sisa = row.total_include;
      }
    }

    setManualRows(updated);
  };

  const deleteManualRow = (index: number) => {
    if (manualRows.length === 1) return;
    setManualRows(manualRows.filter((_, i) => i !== index));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    let insertCount = 0;
    try {
      for (const row of manualRows) {
        if (!row.kode_unik || !row.no_sj_inv || !row.id || !row.kode_barang) {
          throw new Error(`Row ${insertCount + 1} is missing key values.`);
        }
        if (isMockMode) {
          const rowWithSumber = {
            ...row,
            sumber: row.tgl ? row.tgl.substring(0, 4) : "2026",
          };
          addSale(rowWithSumber as Sale);
        } else {
          const { sumber, ...bodyWithoutSumber } = row;
          await api.sales.create(bodyWithoutSumber as Sale);
        }
        insertCount++;
      }
      setSuccess(`Success: ${insertCount} Sales Invoices inserted!`);
      // Reset manual rows
      setManualRows([
        {
          kode_unik: "",
          no_sj_inv: "",
          tgl: new Date().toISOString().split("T")[0],
          id: "",
          customer: "",
          kode_barang: "",
          barang: "",
          qty_kg: 0,
          harga_exc: 0,
          total_include: 0,
          tempo: 30,
          jatuh_tempo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status_tempo: "Belum Lunas",
          fp: "T",
        },
      ]);
    } catch (err: any) {
      setError(err.message || `Failed to submit manual records at row ${insertCount + 1}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.import.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.import.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="px-2.5 py-1 rounded-md border border-border-custom bg-card-bg text-foreground flex items-center gap-1.5 shadow-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${isMockMode ? "bg-amber-500" : "bg-emerald-500"}`} />
            {isMockMode ? "Mock Mode Active" : "Real Database Connection"}
          </span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val as "file" | "manual"); setError(null); setSuccess(null); }}>
        <TabsList>
          <TabsTrigger value="file" className="flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>{t.import.uploadFile}</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5" />
            <span>Bulk Manual Entry Grid</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications */}
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

      {/* Tab 1: Upload Excel File */}
      {activeTab === "file" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Control panel */}
            <div className="border border-border-custom bg-card-bg p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-foreground">{t.import.selectDataType}</h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">{t.import.selectDataType}</label>
                <select
                  value={selectedSheetType}
                  onChange={(e) => handleSheetTypeChange(e.target.value as keyof ParsedData)}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="sales">{t.sales.title} (penjualan)</option>
                  <option value="customers">{t.customers.title} (customers)</option>
                  <option value="products">{t.products.title} (products)</option>
                  <option value="purchasesPT">{t.purchases.ptTab} (pembelian)</option>
                  <option value="purchasesNonPT">{t.purchases.nonPtTab} (beli_non_pt)</option>
                  <option value="payments">{t.payments.title} (pembayaran_terpisah)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-border-custom text-[11px] leading-relaxed text-slate-500">
                <p className="font-bold text-foreground mb-1">Mapping Info:</p>
                Columns in Excel must match model keys (e.g. `kode_unik`, `customer`, `qty_kg`, `total_include`).
              </div>
            </div>

            {/* Dropzone Drop Area */}
            <div className="border border-dashed border-border-custom bg-card-bg/30 p-8 rounded-2xl shadow-sm md:col-span-2 flex flex-col items-center justify-center text-center relative group hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors min-h-[220px]">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-zinc-900 border border-border-custom flex items-center justify-center text-foreground mb-4 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{t.import.dragDropText}</p>
                <p className="text-[10px] text-slate-400 mt-1">{t.import.supportedFormats}</p>
              </div>
              {file && (
                <div className="mt-4 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-semibold text-zinc-900 dark:text-zinc-550 flex items-center gap-1.5 z-20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Table Preview Grid */}
          {previewRows.length > 0 && (
            <div className="border border-border-custom bg-card-bg p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border-custom pb-4">
                <div>
                  <h3 className="font-bold text-sm text-foreground">{t.import.previewRows}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Showing parsed columns from Excel before executing import.</p>
                </div>

                <Button
                  onClick={handleImportSubmit}
                  disabled={loading}
                  className="flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t.import.importing}
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5" />
                      {t.import.executeImport} ({previewRows.length} Rows)
                    </>
                  )}
                </Button>
              </div>

              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-450 uppercase tracking-wider font-semibold border-b border-border-custom bg-slate-50 dark:bg-zinc-900/50">
                      {Object.keys(previewRows[0] || {}).slice(0, 8).map((key) => (
                        <th key={key} className="py-2 px-3 border border-border-custom">{key}</th>
                      ))}
                      {Object.keys(previewRows[0] || {}).length > 8 && <th className="py-2 px-3 border border-border-custom">...</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom text-foreground">
                    {previewRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-500/5">
                        {Object.values(row).slice(0, 8).map((val: any, j) => (
                          <td key={j} className="py-2.5 px-3 border border-border-custom truncate max-w-[150px]" title={String(val)}>
                            {String(val)}
                          </td>
                        ))}
                        {Object.keys(row).length > 8 && <td className="py-2.5 px-3 border border-border-custom text-slate-400">...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewRows.length > 10 && (
                <p className="text-[10px] text-slate-400 italic text-right">+ {previewRows.length - 10} more rows loaded</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Bulk Manual Entry */}
      {activeTab === "manual" && (
        <form onSubmit={handleManualSubmit} className="space-y-6">
          <div className="border border-border-custom bg-card-bg p-6 rounded-2xl shadow-sm space-y-4 overflow-x-auto">
            <div className="flex items-center justify-between border-b border-border-custom pb-4 min-w-[900px]">
              <div>
                <h3 className="font-bold text-sm text-foreground">Bulk Invoice Entry Ledger</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Quickly key in multiple Sales Invoice records simultaneously.</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addManualRow}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || manualRows.length === 0}
                  className="flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save All Invoices</span>
                </Button>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
              <thead>
                <tr className="text-slate-450 uppercase tracking-wider font-semibold border-b border-border-custom">
                  <th className="py-2.5 px-2">Unique Code</th>
                  <th className="py-2.5 px-2">SJ Invoice</th>
                  <th className="py-2.5 px-2">Date</th>
                  <th className="py-2.5 px-2 w-[180px]">Customer</th>
                  <th className="py-2.5 px-2 w-[180px]">Product SKU</th>
                  <th className="py-2.5 px-2">Qty (KG)</th>
                  <th className="py-2.5 px-2">Price Exc.</th>
                  <th className="py-2.5 px-2">Total (Inc.)</th>
                  <th className="py-2.5 px-2 w-[50px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-foreground">
                {manualRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-500/5">
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        required
                        value={row.kode_unik || ""}
                        onChange={(e) => handleManualRowChange(idx, "kode_unik", e.target.value)}
                        placeholder="e.g. SLP/INV/0126/0001-1"
                        className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        required
                        value={row.no_sj_inv || ""}
                        onChange={(e) => handleManualRowChange(idx, "no_sj_inv", e.target.value)}
                        placeholder="SLP/INV/0126/0001"
                        className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="date"
                        required
                        value={row.tgl || ""}
                        onChange={(e) => handleManualRowChange(idx, "tgl", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <select
                        required
                        value={row.id || ""}
                        onChange={(e) => handleManualRowChange(idx, "id", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs"
                      >
                        <option value="">-- Customer --</option>
                        {customers.map((c) => (
                          <option key={c.customer_id} value={c.customer_id}>
                            {c.customer}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-1">
                      <select
                        required
                        value={row.kode_barang || ""}
                        onChange={(e) => handleManualRowChange(idx, "kode_barang", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs"
                      >
                        <option value="">-- Product --</option>
                        {products.map((p) => (
                          <option key={p.kode_product} value={p.kode_product}>
                            {p.kode_product} — {p.nama_product}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={row.qty_kg || 0}
                        onChange={(e) => handleManualRowChange(idx, "qty_kg", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs text-right"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={row.harga_exc || 0}
                        onChange={(e) => handleManualRowChange(idx, "harga_exc", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs text-right"
                      />
                    </td>
                    <td className="py-2 px-2 font-bold text-right text-slate-800 dark:text-slate-200">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(row.total_include || 0)}
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => deleteManualRow(idx)}
                        disabled={manualRows.length === 1}
                        className="p-1.5 rounded-lg border border-border-custom hover:bg-red-50 text-slate-400 hover:text-accent-red cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Delete Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      )}
    </div>
  );
}
