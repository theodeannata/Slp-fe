"use client";

import { useEffect, useState } from "react";
import { useAppStore, Sale } from "@/lib/store";
import { api } from "@/lib/api";
import { Table } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Filter,
  Printer,
  Download,
  FileText,
  Eye,
} from "lucide-react";
import * as XLSX from "xlsx";

interface SaleItemInput {
  kode_unik?: string;
  no_urut: number;
  kode_barang: string;
  barang: string;
  satuan_kemasan: number;
  qty_kg: number;
  harga_inc: number | null;
  harga_exc: number | null;
  total_include: number;
  ppn: number;
  catatan2?: string;
  
  // Fields to preserve if existing
  bagi_hasil?: string | null;
  tgl_bayar_1?: string | null;
  nilai_bayar_1?: number | null;
  terbayar?: number;
  sisa?: number;
  status_tempo?: string;
}

interface InvoiceFormInput {
  tgl: string;
  no_sj_inv: string;
  id: string;
  customer: string;
  npwp: string;
  tempo: number;
  jatuh_tempo: string;
  catatan: string;
  fp: string;
  terbayar: number;
  items: SaleItemInput[];
}

export default function SalesPage() {
  const { sales, customers, products, role, isMockMode, setSales } = useAppStore();
  const [data, setData] = useState<Sale[]>(sales);
  const [selectedSource, setSelectedSource] = useState<string>("2024");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<string | null>(null);
  const [deletedItemCodes, setDeletedItemCodes] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [invoiceLimitError, setInvoiceLimitError] = useState<string | null>(null);

  // View Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewInvoiceNo, setViewInvoiceNo] = useState<string | null>(null);
  const [viewByKodeUnik, setViewByKodeUnik] = useState(false);

  const handleViewInvoice = (id: string, isByKodeUnik: boolean = false) => {
    setViewInvoiceNo(id);
    setViewByKodeUnik(isByKodeUnik);
    setViewModalOpen(true);
  };

  // Form setup
  const { register, control, handleSubmit, reset, watch, setValue } = useForm<InvoiceFormInput>({
    defaultValues: {
      tgl: new Date().toISOString().split("T")[0],
      no_sj_inv: "",
      id: "",
      customer: "",
      npwp: "",
      tempo: 30,
      jatuh_tempo: "",
      catatan: "",
      fp: "T",
      terbayar: 0,
      items: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Watch fields for calculations
  const watchedDate = watch("tgl");
  const watchedTempo = watch("tempo");
  const watchedItems = watch("items");
  const watchedTerbayar = watch("terbayar");

  // Recalculate invoice summaries in real-time
  const totalInclude = watchedItems?.reduce((sum, item) => sum + (Number(item.qty_kg) * Number(item.harga_inc) || 0), 0) || 0;
  const totalExc = watchedItems?.reduce((sum, item) => sum + (Number(item.qty_kg) * (Math.round((Number(item.harga_inc) / 1.11) * 100) / 100) || 0), 0) || 0;
  const totalPpn = Math.max(0, totalInclude - totalExc);
  const totalSisa = Math.max(0, totalInclude - (Number(watchedTerbayar) || 0));
  const statusTempo = totalSisa === 0 ? "Lunas" : "Belum Lunas";

  // Watch for invoice items length changes to enforce 12 items limit
  useEffect(() => {
    if (fields.length > 12) {
      setInvoiceLimitError("An invoice cannot have more than 12 items.");
    } else {
      setInvoiceLimitError(null);
    }
  }, [fields.length]);

  // Auto Invoice Number generation on Date change (for new invoices)
  useEffect(() => {
    if (!modalOpen || selectedInvoiceNumber) return;

    if (watchedDate) {
      try {
        const dateObj = new Date(watchedDate);
        if (!isNaN(dateObj.getTime())) {
          const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
          const yy = String(dateObj.getFullYear()).substring(2, 4);
          const mmyy = `${mm}${yy}`;
          const prefix = `SLP/INV/${mmyy}/`;
          
          const invoiceNos = sales
            .map((s) => s.no_sj_inv)
            .filter((no) => no && no.startsWith(prefix));
            
          let maxNum = 0;
          invoiceNos.forEach((no) => {
            const parts = no.split("/");
            const numStr = parts[parts.length - 1];
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          });
          
          const nextNum = maxNum + 1;
          const nextNumStr = String(nextNum).padStart(4, "0");
          const newInvoiceNo = `${prefix}${nextNumStr}`;
          
          setValue("no_sj_inv", newInvoiceNo);
        }
      } catch (e) {
        console.error("Error generating invoice number:", e);
      }
    }
  }, [watchedDate, modalOpen, selectedInvoiceNumber, sales, setValue]);

  // Auto calculate Jatuh Tempo based on Date and Tempo
  useEffect(() => {
    if (watchedDate && watchedTempo !== undefined) {
      try {
        const dateObj = new Date(watchedDate);
        if (!isNaN(dateObj.getTime())) {
          const days = Number(watchedTempo) || 0;
          const dueDateObj = new Date(dateObj.getTime() + days * 24 * 60 * 60 * 1000);
          setValue("jatuh_tempo", dueDateObj.toISOString().split("T")[0]);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [watchedDate, watchedTempo, setValue]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sourceQuery = selectedSource;
      let list: Sale[] = [];
      if (isMockMode) {
        list = useAppStore.getState().sales;
      } else {
        list = await api.sales.list(sourceQuery); // Fetch only filtered sales records
        setSales(list);
      }

      // Filter locally by year or non_pt (sumber column is deleted in DB)
      if (sourceQuery) {
        if (sourceQuery === "non_pt") {
          list = list.filter(
            (s) =>
              s.sumber === "non_pt" ||
              (s.tgl &&
                s.tgl.substring(0, 4) === "2022" &&
                (s.harga_exc === null || s.harga_exc === undefined || s.harga_exc === 0))
          );
        } else if (sourceQuery === "2022") {
          list = list.filter(
            (s) =>
              s.tgl &&
              s.tgl.substring(0, 4) === "2022" &&
              s.harga_exc !== null &&
              s.harga_exc !== undefined &&
              s.harga_exc > 0
          );
        } else {
          list = list.filter((s) => s.tgl && s.tgl.substring(0, 4) === sourceQuery);
        }
      }

      const sorted = [...list].sort((a, b) => new Date(b.tgl).getTime() - new Date(a.tgl).getTime());
      setData(sorted);
    } catch (err: any) {
      setError(err.message || "Failed to load sales journals.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource, isMockMode]);

  const openAddModal = () => {
    setSelectedInvoiceNumber(null);
    setDeletedItemCodes([]);
    setInvoiceLimitError(null);
    reset({
      tgl: new Date().toISOString().split("T")[0],
      no_sj_inv: "",
      id: customers[0]?.customer_id || "",
      customer: customers[0]?.customer || "",
      npwp: customers[0]?.npwp_ktp || "",
      tempo: 30,
      jatuh_tempo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      catatan: "",
      fp: "T",
      terbayar: 0,
      items: [
        {
          no_urut: 1,
          kode_barang: products[0]?.kode_product || "",
          barang: products[0]?.nama_product || "",
          satuan_kemasan: products[0]?.kemasan_kg || 25,
          qty_kg: 0,
          harga_exc: 0,
          harga_inc: 0,
          total_include: 0,
          ppn: 0,
          catatan2: "",
        }
      ]
    });
    setModalOpen(true);
  };

  const handleEditInvoice = (invoiceNo: string) => {
    setSelectedInvoiceNumber(invoiceNo);
    setDeletedItemCodes([]);
    setInvoiceLimitError(null);

    const invoiceSales = sales
      .filter((s) => s.no_sj_inv === invoiceNo)
      .sort((a, b) => (Number(a.no_urut) || 0) - (Number(b.no_urut) || 0));

    if (invoiceSales.length > 0) {
      const first = invoiceSales[0];
      const totalPaid = invoiceSales.reduce((sum, s) => sum + (s.terbayar || 0), 0);
      
      reset({
        tgl: first.tgl,
        no_sj_inv: first.no_sj_inv,
        id: first.id,
        customer: first.customer,
        npwp: first.npwp || "",
        tempo: first.tempo,
        jatuh_tempo: first.jatuh_tempo,
        catatan: first.catatan || "",
        fp: first.fp || "T",
        terbayar: totalPaid,
        items: invoiceSales.map((s) => ({
          kode_unik: s.kode_unik,
          no_urut: s.no_urut,
          kode_barang: s.kode_barang,
          barang: s.barang,
          satuan_kemasan: s.satuan_kemasan,
          qty_kg: s.qty_kg,
          harga_inc: s.harga_inc,
          harga_exc: s.harga_exc,
          total_include: s.total_include,
          ppn: s.ppn || 0,
          catatan2: s.catatan2 || "",
          terbayar: s.terbayar,
          sisa: s.sisa,
          status_tempo: s.status_tempo,
          bagi_hasil: s.bagi_hasil || "",
          tgl_bayar_1: s.tgl_bayar_1 || "",
          nilai_bayar_1: s.nilai_bayar_1 || 0,
        })),
      });
      setModalOpen(true);
    }
  };

  const handleCustomerChange = (custId: string) => {
    const cust = customers.find((c) => c.customer_id === custId);
    if (cust) {
      setValue("customer", cust.customer);
      setValue("npwp", cust.npwp_ktp);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm("Are you sure you want to delete this invoice record?")) return;
    setError(null);
    setSuccess(null);
    try {
      if (role === "admin") {
        throw new Error("Access Denied: Only Master role accounts can delete invoice journals.");
      }
      setIsLoading(true);
      await api.sales.delete(code);
      setSuccess("Invoice deleted successfully.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (formData: InvoiceFormInput) => {
    if (formData.items.length === 0) {
      setError("An invoice must contain at least one item.");
      return;
    }
    if (formData.items.length > 12) {
      setError("An invoice cannot exceed 12 items.");
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const invoiceTotal = formData.items.reduce((sum, item) => sum + (Number(item.qty_kg) * Number(item.harga_inc) || 0), 0);
      const totalPaid = Number(formData.terbayar) || 0;

      // Distribute payment sequentially across rows
      let paidRemaining = totalPaid;
      const processedItems = formData.items.map((item, idx) => {
        const qty = Number(item.qty_kg) || 0;
        const inc = Number(item.harga_inc) || 0;
        const exc = Math.round((inc / 1.11) * 100) / 100;
        const itemTotal = Math.round(qty * inc * 100) / 100;
        const ppnVal = Math.round((itemTotal - qty * exc) * 100) / 100;
        
        const itemPaid = Math.min(itemTotal, paidRemaining);
        const itemSisa = Math.max(0, itemTotal - itemPaid);
        paidRemaining = Math.max(0, paidRemaining - itemPaid);
        
        const no_urut = idx + 1;
        const no_sj_inv = formData.no_sj_inv;
        const kode_unik = item.kode_unik || `${no_sj_inv}-${no_urut}`;

        const saleRecord: Sale = {
          kode_unik,
          tgl: formData.tgl,
          no_sj_inv,
          id: formData.id,
          customer: formData.customer,
          no_urut,
          kode_barang: item.kode_barang,
          barang: item.barang,
          satuan_kemasan: Number(item.satuan_kemasan),
          qty_kg: qty,
          harga_exc: exc,
          harga_inc: inc,
          total_include: itemTotal,
          nilai_lain: null, // distributed globally at invoice level? Or keep null.
          ppn: ppnVal,
          tempo: Number(formData.tempo),
          jatuh_tempo: formData.jatuh_tempo,
          tgl_bayar_1: item.tgl_bayar_1 || (itemPaid > 0 ? formData.tgl : null),
          nilai_bayar_1: item.nilai_bayar_1 || (itemPaid > 0 ? itemPaid : null),
          sisa: itemSisa,
          terbayar: itemPaid,
          status_tempo: itemSisa === 0 ? "Lunas" : "Belum Lunas",
          bagi_hasil: item.bagi_hasil || null,
          npwp: formData.npwp,
          catatan: formData.catatan,
          catatan2: item.catatan2 || null,
          fp: formData.fp,
        };

        if (isMockMode) {
          saleRecord.sumber = formData.tgl ? formData.tgl.substring(0, 4) : "2026";
        }

        return saleRecord;
      });

      // 1. Process deletions
      if (selectedInvoiceNumber) {
        for (const code of deletedItemCodes) {
          if (!isMockMode) {
            await api.sales.delete(code);
          } else {
            useAppStore.getState().deleteSale(code);
          }
        }
      }

      // 2. Create or Update items
      for (const record of processedItems) {
        const exists = sales.some((s) => s.kode_unik === record.kode_unik);
        if (exists) {
          if (!isMockMode) {
            await api.sales.update(record.kode_unik, record);
          } else {
            useAppStore.getState().updateSale(record.kode_unik, record);
          }
        } else {
          if (!isMockMode) {
            await api.sales.create(record);
          } else {
            useAppStore.getState().addSale(record);
          }
        }
      }

      setSuccess(
        selectedInvoiceNumber
          ? `Invoice ${formData.no_sj_inv} updated successfully.`
          : `Invoice ${formData.no_sj_inv} created successfully.`
      );
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save invoice record.");
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

  const exportSingleInvoiceToExcel = (sale: Sale) => {
    const detailData = [
      { "Invoice Parameter": "Invoice Unique Code", "Value": sale.kode_unik },
      { "Invoice Parameter": "SJ Invoice Number", "Value": sale.no_sj_inv },
      { "Invoice Parameter": "Date Issued", "Value": sale.tgl },
      { "Invoice Parameter": "Due Date", "Value": sale.jatuh_tempo },
      { "Invoice Parameter": "Customer Name", "Value": sale.customer },
      { "Invoice Parameter": "Customer ID", "Value": sale.id },
      { "Invoice Parameter": "Customer NPWP", "Value": sale.npwp || "" },
      { "Invoice Parameter": "Product SKU", "Value": sale.kode_barang },
      { "Invoice Parameter": "Product Name", "Value": sale.barang },
      { "Invoice Parameter": "Packaging Size (kg)", "Value": sale.satuan_kemasan },
      { "Invoice Parameter": "Quantity (kg)", "Value": sale.qty_kg },
      { "Invoice Parameter": "Price Exc. PPN", "Value": sale.harga_exc },
      { "Invoice Parameter": "Price Inc. PPN", "Value": sale.harga_inc },
      { "Invoice Parameter": "PPN (Tax)", "Value": sale.ppn || 0 },
      { "Invoice Parameter": "Total (Inc. PPN)", "Value": sale.total_include },
      { "Invoice Parameter": "Amount Paid", "Value": sale.terbayar },
      { "Invoice Parameter": "Balance (Sisa)", "Value": sale.sisa },
      { "Invoice Parameter": "Status", "Value": sale.status_tempo },
      { "Invoice Parameter": "Catatan", "Value": sale.catatan || "" },
      { "Invoice Parameter": "Faktur Pajak", "Value": sale.fp || "T" },
    ];

    const worksheet = XLSX.utils.json_to_sheet(detailData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice details");
    XLSX.writeFile(workbook, `Invoice_${sale.kode_unik.replace(/\//g, "_")}.xlsx`);
  };

  const exportInvoiceListToExcel = () => {
    const formatted = data.map((item) => ({
      "Invoice Code": item.kode_unik,
      "SJ Inv": item.no_sj_inv,
      "Date": item.tgl,
      "Customer": item.customer,
      "Product": item.barang,
      "Qty (kg)": item.qty_kg,
      "Price Exc.": item.harga_exc,
      "Price Inc.": item.harga_inc,
      "Total Inc.": item.total_include,
      "Paid": item.terbayar,
      "Sisa": item.sisa,
      "Status": item.status_tempo,
      "Faktur Pajak": item.fp,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Journal");
    XLSX.writeFile(workbook, "Sales_Invoices_Journal.xlsx");
  };

  const columns = [
    {
      header: "SJ / Invoice Code",
      sortKey: "no_sj_inv" as keyof Sale,
      accessor: (item: Sale) => (
        <div className="flex flex-col text-left">
          {item.no_sj_inv ? (
            <>
              <button
                type="button"
                onClick={() => handleViewInvoice(item.no_sj_inv, false)}
                className="text-left font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus:outline-none"
              >
                {item.no_sj_inv}
              </button>
              <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono tracking-tight mt-0.5">
                Code: {item.kode_unik}
              </span>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleViewInvoice(item.kode_unik, true)}
                className="text-left font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus:outline-none"
              >
                {item.kode_unik}
              </button>
              <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono tracking-tight mt-0.5">
                SJ: -
              </span>
            </>
          )}
        </div>
      ),
    },
    {
      header: "Date",
      sortKey: "tgl" as keyof Sale,
      accessor: (item: Sale) => (
        <div className="flex flex-col text-left">
          <span className="font-medium text-slate-700 dark:text-slate-330">{item.tgl}</span>
          <span className="text-[10px] font-semibold text-foreground uppercase mt-0.5">
            Year: {item.tgl ? item.tgl.substring(0, 4) : "-"}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      sortKey: "customer" as keyof Sale,
      accessor: (item: Sale) => (
        <div className="flex flex-col text-left">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{item.customer}</span>
          <span className="text-[10px] font-mono text-slate-400">ID: {item.id}</span>
        </div>
      ),
    },
    {
      header: "Product / Qty",
      sortKey: "barang" as keyof Sale,
      accessor: (item: Sale) => (
        <div className="flex flex-col text-left">
          <span className="font-medium text-slate-850 dark:text-slate-200">{item.barang}</span>
          <span className="text-[10px] text-slate-450 mt-0.5">
            {item.qty_kg} kg ({item.satuan_kemasan}kg {item.kode_barang})
          </span>
        </div>
      ),
    },
    {
      header: "Total (Inc PPN)",
      sortKey: "total_include" as keyof Sale,
      accessor: (item: Sale) => (
        <span className="font-bold text-slate-850 dark:text-slate-150">
          {formatRupiah(item.total_include)}
        </span>
      ),
    },
    {
      header: "Paid / Bal.",
      sortKey: "terbayar" as keyof Sale,
      accessor: (item: Sale) => (
        <div className="flex flex-col text-right">
          <span className="font-semibold text-accent-green">{formatRupiah(item.terbayar)}</span>
          <span className="text-[10px] font-semibold text-accent-amber mt-0.5">
            Sisa: {formatRupiah(item.sisa)}
          </span>
        </div>
      ),
    },
    {
      header: "FP / Tempo",
      sortKey: "tempo" as keyof Sale,
      accessor: (item: Sale) => (
        <div className="flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
              item.fp === "T"
                ? "bg-blue-500/10 border-blue-500/20 text-accent-blue"
                : "bg-slate-100 dark:bg-slate-800 border-card-border text-slate-400"
            }`}
          >
            FP:{item.fp || "F"}
          </span>
          <span className="text-xs text-slate-450 dark:text-slate-500">{item.tempo} days</span>
        </div>
      ),
    },
    {
      header: "Status",
      sortKey: "status_tempo" as keyof Sale,
      accessor: (item: Sale) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider
            ${
              item.status_tempo === "Lunas"
                ? "bg-emerald-500/10 border-emerald-500/20 text-accent-green"
                : "bg-amber-500/10 border-amber-500/20 text-accent-amber"
            }`}
        >
          {item.status_tempo}
        </span>
      ),
    },
  ];

  const viewInvoiceItems = viewInvoiceNo
    ? sales
        .filter((s) =>
          viewByKodeUnik
            ? s.kode_unik === viewInvoiceNo
            : s.no_sj_inv === viewInvoiceNo
        )
        .sort((a, b) => (Number(a.no_urut) || 0) - (Number(b.no_urut) || 0))
    : [];

  const firstViewItem = viewInvoiceItems[0];
  const viewGrandTotal = viewInvoiceItems.reduce((sum, item) => sum + (item.total_include || 0), 0);
  const viewTotalPaid = viewInvoiceItems.reduce((sum, item) => sum + (item.terbayar || 0), 0);
  const viewTotalSisa = viewInvoiceItems.reduce((sum, item) => sum + (item.sisa || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Sales Invoices Journal
          </h1>
          <p className="text-xs text-slate-550 mt-0.5">
            Manage transactions, tracking, and tax details of sales invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportInvoiceListToExcel}
            className="px-4 py-2.5 border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export Journal (.xlsx)</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sales Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter and controls */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs text-slate-400 font-medium">Filter by Year:</span>
        {["2022", "2023", "2024", "2025", "2026", "non_pt"].map((src) => (
          <button
            key={src}
            onClick={() => setSelectedSource(src)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-colors
              ${
                selectedSource === src
                  ? "bg-primary-light text-primary border-primary/20"
                  : "border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
          >
            {src === "non_pt" ? "Non-PT" : src}
          </button>
        ))}
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

      {/* Table grid */}
      <Table
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Search invoices by invoice code or customer..."
        searchFilter={(item, query) =>
          (item.kode_unik ? item.kode_unik.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.customer ? item.customer.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.no_sj_inv ? item.no_sj_inv.toLowerCase().includes(query.toLowerCase()) : false)
        }
        actions={(item) => (
          <>
            <button
              type="button"
              onClick={() => handleViewInvoice(item.no_sj_inv || item.kode_unik, !item.no_sj_inv)}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="View Invoice Items"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.open(`/sales/print/faktur?invoiceNo=${encodeURIComponent(item.no_sj_inv)}`, "_blank")}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 hover:text-slate-900 dark:hover:text-slate-150 transition-colors cursor-pointer"
              title="Print Faktur (Invoice)"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.open(`/sales/print/sj-tt?invoiceNo=${encodeURIComponent(item.no_sj_inv)}`, "_blank")}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-555 hover:text-slate-900 dark:hover:text-slate-150 transition-colors cursor-pointer"
              title="Print SJ + TT (Delivery)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
            </button>
            <button
              onClick={() => exportSingleInvoiceToExcel(item)}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-555 hover:text-slate-900 dark:hover:text-slate-150 transition-colors cursor-pointer"
              title="Export to Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleEditInvoice(item.no_sj_inv)}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Edit Invoice"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(item.kode_unik)}
              disabled={role === "admin"}
              className={`p-1.5 rounded-lg border border-border-custom hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-accent-red transition-colors cursor-pointer
                ${role === "admin" ? "opacity-30 cursor-not-allowed" : ""}`}
              title={role === "admin" ? "Master Only feature" : "Delete Record"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      />

      {/* Add / Edit invoice Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedInvoiceNumber ? `Edit Sales Invoice: ${selectedInvoiceNumber}` : "Create Sales Invoice"}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {invoiceLimitError && (
            <div className="p-3 rounded-xl border bg-red-500/10 text-accent-red border-red-500/20 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{invoiceLimitError}</span>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border-custom pb-1.5">
              Invoice Header Info
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">SJ Invoice Number</label>
                <input
                  type="text"
                  required
                  readOnly={!!selectedInvoiceNumber}
                  placeholder="e.g. SLP/INV/0124/0001"
                  {...register("no_sj_inv")}
                  className={`w-full px-3 py-2 border border-border-custom rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20
                    ${selectedInvoiceNumber 
                      ? "bg-slate-100 dark:bg-zinc-800/80 cursor-not-allowed text-slate-700 dark:text-slate-350" 
                      : "bg-card-bg text-foreground"
                    }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Date</label>
                <input
                  type="date"
                  required
                  {...register("tgl")}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Customer ID</label>
                <input
                  type="text"
                  required
                  placeholder="Type or Select ID..."
                  list="sales-customers-list"
                  {...register("id", { required: true })}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="Customer Name..."
                  {...register("customer", { required: true })}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Credit Terms (Days)</label>
                <input
                  type="number"
                  required
                  {...register("tempo", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Jatuh Tempo (Due Date)</label>
                <input
                  type="date"
                  required
                  readOnly
                  {...register("jatuh_tempo")}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm cursor-not-allowed text-slate-700 dark:text-slate-350"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Faktur Pajak (FP)</label>
                <select
                  {...register("fp")}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="T">True (T)</option>
                  <option value="F">False (F)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Customer NPWP</label>
                <input
                  type="text"
                  placeholder="NPWP"
                  {...register("npwp")}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Delivery Notes (Catatan)</label>
              <textarea
                {...register("catatan")}
                rows={1.5}
                placeholder="e.g. Kirim ke Gudang Utama..."
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* DYNAMIC FIELD ARRAY FOR INVOICE ITEMS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-custom pb-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Invoice Items List ({fields.length} of 12)
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (fields.length >= 12) return;
                  append({
                    no_urut: fields.length + 1,
                    kode_barang: products[0]?.kode_product || "",
                    barang: products[0]?.nama_product || "",
                    satuan_kemasan: products[0]?.kemasan_kg || 25,
                    qty_kg: 0,
                    harga_exc: 0,
                    harga_inc: 0,
                    total_include: 0,
                    ppn: 0,
                    catatan2: "",
                  });
                }}
                disabled={fields.length >= 12}
                className="px-3 py-1.5 bg-primary-light hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Row</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {fields.map((field, index) => {
                const itemQty = Number(watchedItems?.[index]?.qty_kg) || 0;
                const itemInc = Number(watchedItems?.[index]?.harga_inc) || 0;
                const itemExc = Math.round((itemInc / 1.11) * 100) / 100;
                const itemTotal = Math.round(itemQty * itemInc * 100) / 100;

                return (
                  <div
                    key={field.id}
                    className="p-4 rounded-xl border border-border-custom bg-slate-50/50 dark:bg-zinc-900/30 space-y-3 relative"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Item #{index + 1}</span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const itemCode = watchedItems?.[index]?.kode_unik;
                            if (itemCode) {
                              setDeletedItemCodes((prev) => [...prev, itemCode]);
                            }
                            remove(index);
                          }}
                          className="p-1 text-slate-400 hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Product SKU (Type or Select)</label>
                        <input
                          type="text"
                          required
                          placeholder="SKU"
                          list="sales-products-list"
                          {...register(`items.${index}.kode_barang` as const, { required: true })}
                          onChange={(e) => {
                            const code = e.target.value;
                            setValue(`items.${index}.kode_barang`, code);
                            const matchingProd = products.find((p) => p.kode_product === code);
                            if (matchingProd) {
                              setValue(`items.${index}.barang`, matchingProd.nama_product);
                              setValue(`items.${index}.satuan_kemasan`, matchingProd.kemasan_kg);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs focus:ring-1 focus:ring-primary/20 focus:outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1 col-span-2 sm:col-span-2">
                        <label className="text-[10px] font-semibold text-slate-400">Product Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Product Name"
                          {...register(`items.${index}.barang` as const, { required: true })}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs focus:ring-1 focus:ring-primary/20 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Kemasan (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="25"
                          {...register(`items.${index}.satuan_kemasan` as const, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs focus:ring-1 focus:ring-primary/20 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Quantity (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0"
                          {...register(`items.${index}.qty_kg` as const, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs focus:ring-1 focus:ring-primary/20 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Price Inc. PPN (IDR)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0"
                          {...register(`items.${index}.harga_inc` as const, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs font-semibold focus:ring-1 focus:ring-primary/20 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Price Exc. PPN (IDR)</label>
                        <div className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs text-slate-500 font-medium">
                          {itemExc ? formatRupiah(itemExc) : "-"}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Row Total (Inc PPN)</label>
                        <div className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-foreground">
                          {itemTotal ? formatRupiah(itemTotal) : "-"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Internal Row Remark (Catatan 2)</label>
                      <input
                        type="text"
                        placeholder="Internal notes for this item row..."
                        {...register(`items.${index}.catatan2` as const)}
                        className="w-full px-2.5 py-1 border border-border-custom rounded-lg bg-card-bg text-xs focus:ring-1 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
              {fields.length === 0 && (
                <div className="text-center py-6 text-slate-400 border border-dashed border-border-custom rounded-xl">
                  No items added. Click "Add Item Row" to list goods.
                </div>
              )}
            </div>
            <datalist id="sales-products-list">
              {products.map((p) => (
                <option key={p.kode_product} value={p.kode_product}>
                  {p.kode_product} — {p.nama_product}
                </option>
              ))}
            </datalist>
            <datalist id="sales-customers-list">
              {customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.customer_id} — {c.customer}
                </option>
              ))}
            </datalist>
          </div>

          {/* INVOICE SUMMARY SECTION */}
          <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-border-custom space-y-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border-custom pb-1.5">
              Invoice Pricing Summary
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Total DPP (Exc. PPN)</label>
                <div className="px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm font-medium text-slate-650">
                  {formatRupiah(totalExc)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">PPN (Tax 11%)</label>
                <div className="px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm font-medium text-slate-650">
                  {formatRupiah(totalPpn)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Grand Total (Inc. PPN)</label>
                <div className="px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm font-bold text-foreground">
                  {formatRupiah(totalInclude)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border-custom pt-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Amount Paid (Terbayar IDR)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...register("terbayar", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm font-bold text-accent-green focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Balance Remaining (Sisa IDR)</label>
                <div className="px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm font-bold text-accent-amber">
                  {formatRupiah(totalSisa)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Settlement Status</label>
                <div className="px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm uppercase tracking-wider font-bold">
                  <span className={statusTempo === "Lunas" ? "text-accent-green" : "text-accent-amber"}>
                    {statusTempo}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border-custom">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !!invoiceLimitError}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{selectedInvoiceNumber ? "Update Invoice" : "Create Invoice"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View Invoice Items Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewInvoiceNo(null);
          setViewByKodeUnik(false);
        }}
        title={viewByKodeUnik ? `Sales Record Details: ${viewInvoiceNo || ""}` : `Invoice Details: ${viewInvoiceNo || ""}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          {viewInvoiceItems.length > 0 && firstViewItem ? (
            <>
              {/* Header Info */}
              <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-border-custom">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border-custom pb-1.5 mb-3">
                  Invoice Header Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Customer:</span>
                    <span className="font-bold text-foreground">{firstViewItem.customer}</span>
                    <span className="text-[10px] text-slate-450 font-mono block">ID: {firstViewItem.id}</span>
                    {firstViewItem.npwp && (
                      <span className="text-[10px] text-slate-450 font-mono block">NPWP: {firstViewItem.npwp}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Date Issued:</span>
                    <span className="font-medium text-foreground">{firstViewItem.tgl}</span>
                    <span className="text-slate-400 font-semibold block mt-2">Due Date:</span>
                    <span className="font-medium text-foreground">{firstViewItem.jatuh_tempo} ({firstViewItem.tempo} days)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Faktur Pajak:</span>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${
                        firstViewItem.fp === "T"
                          ? "bg-blue-500/10 border-blue-500/20 text-accent-blue"
                          : "bg-slate-100 dark:bg-slate-800 border-card-border text-slate-400"
                      }`}
                    >
                      FP: {firstViewItem.fp || "F"}
                    </span>
                    <span className="text-slate-400 font-semibold block mt-2">Payment Status:</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider mt-0.5 ${
                        viewTotalSisa === 0
                          ? "bg-emerald-500/10 border-emerald-500/20 text-accent-green"
                          : "bg-amber-500/10 border-amber-500/20 text-accent-amber"
                      }`}
                    >
                      {viewTotalSisa === 0 ? "Lunas" : "Belum Lunas"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Delivery Remarks:</span>
                    <p className="text-slate-650 dark:text-slate-350 italic mt-0.5">
                      {firstViewItem.catatan || "No custom delivery notes."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-border-custom rounded-xl overflow-hidden bg-card-bg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-450 uppercase tracking-wider font-semibold border-b border-border-custom bg-slate-50 dark:bg-zinc-900/50">
                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                      <th className="py-2.5 px-3">Item Code</th>
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-3 text-right">Qty (KG)</th>
                      <th className="py-2.5 px-3 text-right">Price Inc. PPN</th>
                      <th className="py-2.5 px-3 text-right">Total (Inc. PPN)</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom text-foreground">
                    {viewInvoiceItems.map((item, idx) => (
                      <tr key={item.kode_unik || idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400">{item.no_urut}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{item.kode_unik}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold block">{item.barang}</span>
                          <span className="text-[10px] text-slate-400">{item.kode_barang} • Kemasan: {item.satuan_kemasan}kg</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">{item.qty_kg} kg</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(item.harga_inc || 0)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold font-mono">{formatRupiah(item.total_include)}</td>
                        <td className="py-2.5 px-3 text-slate-500 italic">{item.catatan2 || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Price summary */}
              <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-border-custom space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border-custom pb-1.5">
                  Payment and Balance Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-1">Invoice Grand Total:</span>
                    <span className="text-sm font-black text-foreground">{formatRupiah(viewGrandTotal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-1">Total Paid (Terbayar):</span>
                    <span className="text-sm font-bold text-accent-green">{formatRupiah(viewTotalPaid)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-1">Balance Remaining (Sisa):</span>
                    <span className="text-sm font-bold text-accent-amber">{formatRupiah(viewTotalSisa)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No items found for this invoice number.
            </div>
          )}

          {/* Close action */}
          <div className="pt-4 flex items-center justify-end border-t border-border-custom">
            <button
              type="button"
              onClick={() => {
                setViewModalOpen(false);
                setViewInvoiceNo(null);
                setViewByKodeUnik(false);
              }}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
