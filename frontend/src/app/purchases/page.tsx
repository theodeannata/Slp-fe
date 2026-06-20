"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, Purchase } from "@/lib/store";
import { api } from "@/lib/api";
import { Table } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Lock,
  Plus,
  ArrowUpRight,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Edit2,
  Trash2,
  Filter,
  Eye,
  Printer,
} from "lucide-react";

interface PurchaseItemInput {
  kode_unik?: string;
  no_urut: number;
  kode_barang: string;
  barang: string;
  qty_kg: number;
  qty_terima_kg: number;
  dpp: number;
  harga: number;
  total: number;
  jual: number | null;
  total_jual: number | null;
  untung: number | null;
  persen: number | null;
  coa_halal?: string;
}

interface PurchaseFormInput {
  tgl_po: string;
  tgl_terima_barang: string;
  tgl_bayar: string;
  no_po: string;
  vendor: string;
  note: string;
  items: PurchaseItemInput[];
}

export default function PurchasesPage() {
  const {
    purchasesPT,
    purchasesNonPT,
    products,
    role,
    setAuth,
    user,
    isMockMode,
    setPurchasesPT,
    setPurchasesNonPT,
  } = useAppStore();

  const router = useRouter();

  useEffect(() => {
    if (role === "admin") {
      router.push("/");
    }
  }, [role, router]);

  const vendors = Array.from(
    new Set([...purchasesPT.map((p) => p.vendor), ...purchasesNonPT.map((p) => p.vendor)].filter(Boolean))
  );

  const [activeTab, setActiveTab] = useState<"pt" | "non-pt">("pt");
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [data, setData] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPoNumber, setSelectedPoNumber] = useState<string | null>(null);
  const [deletedItemCodes, setDeletedItemCodes] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [poLimitError, setPoLimitError] = useState<string | null>(null);

  // View PO Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewPoNo, setViewPoNo] = useState<string | null>(null);

  const handleViewPo = (poNo: string) => {
    setViewPoNo(poNo);
    setViewModalOpen(true);
  };

  // Form setup
  const { register, control, handleSubmit, reset, watch, setValue } = useForm<PurchaseFormInput>({
    defaultValues: {
      tgl_po: new Date().toISOString().split("T")[0],
      tgl_terima_barang: new Date().toISOString().split("T")[0],
      tgl_bayar: new Date().toISOString().split("T")[0],
      no_po: "",
      vendor: "",
      note: "",
      items: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Watch fields for calculations
  const watchedDate = watch("tgl_po");
  const watchedItems = watch("items");

  // Sum calculations
  const totalCost = watchedItems?.reduce((sum, item) => sum + (Number(item.qty_kg) * Number(item.harga) || 0), 0) || 0;
  const totalDPP = watchedItems?.reduce((sum, item) => sum + (Number(item.qty_kg) * (Number(item.dpp) || Math.round((Number(item.harga) / 1.11) * 100) / 100) || 0), 0) || 0;
  const totalJual = watchedItems?.reduce((sum, item) => sum + (Number(item.qty_kg) * Number(item.jual || 0) || 0), 0) || 0;
  const totalProfit = totalJual > 0 ? Math.max(0, totalJual - totalCost) : 0;
  const totalMargin = totalCost > 0 ? Math.round((totalProfit / totalCost) * 10000) / 100 : 0;

  // Enforce 12 items limit
  useEffect(() => {
    if (fields.length > 12) {
      setPoLimitError("A purchase order cannot have more than 12 items.");
    } else {
      setPoLimitError(null);
    }
  }, [fields.length]);

  // Auto PO Number generation
  useEffect(() => {
    if (!modalOpen || selectedPoNumber) return;

    if (watchedDate) {
      try {
        const dateObj = new Date(watchedDate);
        if (!isNaN(dateObj.getTime())) {
          const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
          const yy = String(dateObj.getFullYear()).substring(2, 4);
          const mmyy = `${mm}${yy}`;
          
          // Enforce yearly sequence: match SLP/PO/??[yy]/XXXX
          const regex = new RegExp(`^SLP/PO/\\d{2}${yy}/(\\d{4})$`);
          let maxNum = 0;
          const currentPurchasesList = [
            ...purchasesPT,
            ...purchasesNonPT
          ];
          
          currentPurchasesList.forEach((p) => {
            if (p.no_po) {
              const match = p.no_po.match(regex);
              if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxNum) {
                  maxNum = num;
                }
              }
            }
          });
          
          const nextNumStr = String(maxNum + 1).padStart(4, "0");
          const newPoNo = `SLP/PO/${mmyy}/${nextNumStr}`;
          
          setValue("no_po", newPoNo);
        }
      } catch (e) {
        console.error("Error generating PO number:", e);
      }
    }
  }, [watchedDate, modalOpen, selectedPoNumber, purchasesPT, purchasesNonPT, setValue]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let list: Purchase[] = [];
      if (isMockMode) {
        const cache = useAppStore.getState();
        list = activeTab === "pt" ? cache.purchasesPT : cache.purchasesNonPT;
        if (selectedYear) {
          list = list.filter((p) => p.tgl_po && p.tgl_po.substring(0, 4) === selectedYear);
        }
      } else {
        list =
          activeTab === "pt"
            ? await api.purchases.listPT(selectedYear)
            : await api.purchases.listNonPT(selectedYear);
      }
      const sorted = [...list].sort((a, b) => new Date(b.tgl_po).getTime() - new Date(a.tgl_po).getTime());
      setData(sorted);
      if (!isMockMode) {
        if (activeTab === "pt") {
          setPurchasesPT(list);
        } else {
          setPurchasesNonPT(list);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load purchases journal.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === "master") {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, role, isMockMode, selectedYear]);

  const unlockMaster = () => {
    setAuth(
      user
        ? { ...user, email: "master@slp.id" }
        : { email: "master@slp.id", id: "demo-user-id" },
      "master"
    );
  };

  const openAddModal = () => {
    setSelectedPoNumber(null);
    setDeletedItemCodes([]);
    setPoLimitError(null);
    reset({
      tgl_po: new Date().toISOString().split("T")[0],
      tgl_terima_barang: new Date().toISOString().split("T")[0],
      tgl_bayar: new Date().toISOString().split("T")[0],
      no_po: "",
      vendor: "",
      note: "",
      items: [
        {
          no_urut: 1,
          kode_barang: products[0]?.kode_product || "",
          barang: products[0]?.nama_product || "",
          qty_kg: 0,
          qty_terima_kg: 0,
          dpp: 0,
          harga: 0,
          total: 0,
          jual: 0,
          total_jual: 0,
          untung: 0,
          persen: 0,
          coa_halal: "Y",
        }
      ]
    });
    setModalOpen(true);
  };

  const handleEditPo = (poNo: string) => {
    setSelectedPoNumber(poNo);
    setDeletedItemCodes([]);
    setPoLimitError(null);

    const isPT = activeTab === "pt";
    const currentPurchases = isPT ? purchasesPT : purchasesNonPT;
    const poSales = currentPurchases
      .filter((p) => p.no_po === poNo)
      .sort((a, b) => (Number(a.no_urut) || 0) - (Number(b.no_urut) || 0));

    if (poSales.length > 0) {
      const first = poSales[0];
      
      reset({
        tgl_po: first.tgl_po,
        tgl_terima_barang: first.tgl_terima_barang,
        tgl_bayar: first.tgl_bayar,
        no_po: first.no_po,
        vendor: first.vendor,
        note: first.note || "",
        items: poSales.map((p) => ({
          kode_unik: p.kode_unik,
          no_urut: p.no_urut,
          kode_barang: p.kode_barang,
          barang: p.barang,
          qty_kg: p.qty_kg,
          qty_terima_kg: p.qty_terima_kg,
          dpp: p.dpp,
          harga: p.harga,
          total: p.total,
          jual: p.jual,
          total_jual: p.total_jual,
          untung: p.untung,
          persen: p.persen,
          coa_halal: p.coa_halal || "Y",
        })),
      });
      setModalOpen(true);
    }
  };

  const handleDeletePo = async (poNo: string, groupItems: any[]) => {
    if (!confirm(`Are you sure you want to delete PO ${poNo} and all of its ${groupItems.length} items?`)) return;
    setError(null);
    setSuccess(null);
    try {
      if (role === "admin") {
        throw new Error("Access Denied: Only Master accounts can delete PO records.");
      }
      setIsLoading(true);
      const isPT = activeTab === "pt";
      for (const item of groupItems) {
        if (!isMockMode) {
          if (isPT) {
            await api.purchases.deletePT(item.kode_unik);
          } else {
            await api.purchases.deleteNonPT(item.kode_unik);
          }
        } else {
          if (isPT) {
            useAppStore.getState().deletePurchasePT(item.kode_unik);
          } else {
            useAppStore.getState().deletePurchaseNonPT(item.kode_unik);
          }
        }
      }
      setSuccess(`PO ${poNo} deleted successfully.`);
      loadData();
    } catch (err: any) {
      setError(err.message || "Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (formData: PurchaseFormInput) => {
    if (formData.items.length === 0) {
      setError("A PO must contain at least one item.");
      return;
    }
    if (formData.items.length > 12) {
      setError("A PO cannot exceed 12 items.");
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const processedItems = formData.items.map((item, idx) => {
        const qty = Number(item.qty_kg) || 0;
        const qtyRecv = Number(item.qty_terima_kg) || 0;
        const harga = Number(item.harga) || 0;
        const total = qty * harga;
        
        let dpp = Number(item.dpp) || 0;
        if (!dpp && harga) {
          dpp = Math.round((harga / 1.11) * 100) / 100;
        }

        const jual = item.jual ? Number(item.jual) : null;
        let totalJual = null;
        let untung = null;
        let persen = null;
        if (jual) {
          totalJual = qty * jual;
          untung = totalJual - total;
          persen = Math.round((untung / total) * 10000) / 100;
        }

        const no_urut = idx + 1;
        const no_po = formData.no_po;
        const kode_unik = item.kode_unik || `${no_po}-${no_urut}`;

        const purchaseRecord: Purchase = {
          kode_unik,
          tgl_po: formData.tgl_po,
          tgl_terima_barang: formData.tgl_terima_barang,
          tgl_bayar: formData.tgl_bayar,
          no_po,
          vendor: formData.vendor,
          no_urut,
          kode_barang: item.kode_barang,
          barang: item.barang,
          qty_kg: qty,
          qty_terima_kg: qtyRecv,
          dpp,
          harga,
          total,
          note: formData.note || null,
          jual,
          total_jual: totalJual,
          untung,
          persen,
          coa_halal: activeTab === "non-pt" ? item.coa_halal : undefined,
        };

        return purchaseRecord;
      });

      const isPT = activeTab === "pt";
      const currentList = isPT ? purchasesPT : purchasesNonPT;

      // 1. Process deletions
      if (selectedPoNumber) {
        for (const code of deletedItemCodes) {
          if (!isMockMode) {
            if (isPT) {
              await api.purchases.deletePT(code);
            } else {
              await api.purchases.deleteNonPT(code);
            }
          } else {
            if (isPT) {
              useAppStore.getState().deletePurchasePT(code);
            } else {
              useAppStore.getState().deletePurchaseNonPT(code);
            }
          }
        }
      }

      // 2. Create or Update items
      for (const record of processedItems) {
        const exists = currentList.some((p) => p.kode_unik === record.kode_unik);
        if (exists) {
          if (!isMockMode) {
            if (isPT) {
              await api.purchases.updatePT(record.kode_unik, record);
            } else {
              await api.purchases.updateNonPT(record.kode_unik, record);
            }
          } else {
            if (isPT) {
              useAppStore.getState().updatePurchasePT(record.kode_unik, record);
            } else {
              useAppStore.getState().updatePurchaseNonPT(record.kode_unik, record);
            }
          }
        } else {
          if (!isMockMode) {
            if (isPT) {
              await api.purchases.createPT(record);
            } else {
              await api.purchases.createNonPT(record);
            }
          } else {
            if (isPT) {
              useAppStore.getState().addPurchasePT(record);
            } else {
              useAppStore.getState().addPurchaseNonPT(record);
            }
          }
        }
      }

      setSuccess(
        selectedPoNumber
          ? `Purchase PO ${formData.no_po} updated successfully.`
          : `Purchase PO ${formData.no_po} registered successfully.`
      );
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save purchase PO.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatRupiah = (num: number | null) => {
    if (num === null || num === undefined) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Switch locks view for simple RLS simulations
  if (role === "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-border-custom flex items-center justify-center text-foreground shadow-sm">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Purchases PO Module Restricted
          </h2>
          <p className="text-slate-500 dark:text-slate-450 text-sm leading-relaxed">
            Access to purchasing journals is protected under Database Row Level Security (RLS) policies. Only accounts with the <strong className="font-bold text-foreground">Master</strong> role can view or add purchase orders.
          </p>
        </div>
        <button
          onClick={unlockMaster}
          className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-background rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
        >
          <Shield className="w-4 h-4" />
          <span>Switch Session Role to Master</span>
        </button>
      </div>
    );
  }

  // Aggregate purchases by no_po
  const groupedData = Object.values(
    data.reduce<Record<string, Purchase & { groupItemsCount: number; allGroupItems: Purchase[] }>>((acc, item) => {
      const key = item.no_po;
      if (!acc[key]) {
        acc[key] = {
          ...item,
          groupItemsCount: 0,
          allGroupItems: [],
        };
      }
      
      acc[key].allGroupItems.push(item);
      acc[key].groupItemsCount += 1;
      
      if (item.no_urut === 1) {
        const count = acc[key].groupItemsCount;
        const allItems = acc[key].allGroupItems;
        acc[key] = {
          ...item,
          groupItemsCount: count,
          allGroupItems: allItems,
        };
      }
      
      return acc;
    }, {})
  ).map((group) => {
    const totalCost = group.allGroupItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalQty = group.allGroupItems.reduce((sum, item) => sum + (item.qty_kg || 0), 0);
    const totalQtyRecv = group.allGroupItems.reduce((sum, item) => sum + (item.qty_terima_kg || 0), 0);
    const totalProfit = group.allGroupItems.reduce((sum, item) => sum + (item.untung || 0), 0);
    const totalDpp = group.allGroupItems.reduce((sum, item) => sum + (item.dpp || 0), 0);
    const totalMargin = totalCost > 0 ? Math.round((totalProfit / totalCost) * 10000) / 100 : 0;
    
    group.allGroupItems.sort((a, b) => (a.no_urut || 0) - (b.no_urut || 0));

    return {
      ...group,
      total: totalCost,
      qty_kg: totalQty,
      qty_terima_kg: totalQtyRecv,
      dpp: totalDpp,
      untung: totalProfit,
      persen: totalMargin,
    };
  });

  const sortedGroupedData = [...groupedData].sort((a, b) => {
    const timeA = a.tgl_po ? new Date(a.tgl_po).getTime() : 0;
    const timeB = b.tgl_po ? new Date(b.tgl_po).getTime() : 0;
    return timeB - timeA;
  });

  const viewPoItems = viewPoNo
    ? (activeTab === "pt" ? purchasesPT : purchasesNonPT)
        .filter((p) => p.no_po === viewPoNo)
        .sort((a, b) => (Number(a.no_urut) || 0) - (Number(b.no_urut) || 0))
    : [];

  const firstViewPoItem = viewPoItems[0];
  const viewGrandTotal = viewPoItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const viewTotalDpp = viewPoItems.reduce((sum, item) => sum + (item.dpp || 0), 0);
  const viewTotalProfit = viewPoItems.reduce((sum, item) => sum + (item.untung || 0), 0);
  const viewAggregatedMargin = viewGrandTotal > 0 ? Math.round((viewTotalProfit / viewGrandTotal) * 10000) / 100 : 0;

  const columns = [
    {
      header: "PO Code / Unique Code",
      sortKey: "no_po" as keyof Purchase,
      accessor: (item: any) => (
        <div className="flex flex-col text-left">
          <button
            type="button"
            onClick={() => handleViewPo(item.no_po)}
            className="text-left font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus:outline-none"
          >
            {item.no_po}
          </button>
          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono tracking-tight mt-0.5">
            Code: {item.kode_unik}
          </span>
        </div>
      ),
    },
    {
      header: "Vendor",
      sortKey: "vendor" as keyof Purchase,
      accessor: (item: Purchase) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{item.vendor}</span>
      ),
    },
    {
      header: "Receipt Details",
      sortKey: "tgl_po" as keyof Purchase,
      accessor: (item: Purchase) => (
        <div className="flex flex-col text-left">
          <span className="text-xs text-slate-650 dark:text-slate-350">
            PO: {item.tgl_po}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            Recv: {item.tgl_terima_barang} | Paid: {item.tgl_bayar}
          </span>
        </div>
      ),
    },
    {
      header: "Item Description",
      sortKey: "barang" as keyof Purchase,
      accessor: (item: any) => (
        <div className="flex flex-col text-left">
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {item.barang}
            {item.groupItemsCount > 1 && (
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-slate-350 border border-border-custom">
                +{item.groupItemsCount - 1} more items
              </span>
            )}
          </span>
          <span className="text-[10px] text-slate-450 mt-0.5">
            Recv {item.qty_terima_kg}kg / Ordered {item.qty_kg}kg ({item.kode_barang})
          </span>
        </div>
      ),
    },
    {
      header: "DPP / Base Price",
      sortKey: "harga" as keyof Purchase,
      accessor: (item: any) => (
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-650 dark:text-slate-350">
            {formatRupiah(item.harga)}
          </span>
          <span className="text-[10px] text-slate-400">DPP: {formatRupiah(item.dpp)}</span>
          {item.groupItemsCount > 1 && (
            <span className="text-[9px] text-slate-400 mt-0.5">(First Item)</span>
          )}
        </div>
      ),
    },
    {
      header: "Total Cost",
      sortKey: "total" as keyof Purchase,
      accessor: (item: Purchase) => (
        <span className="font-bold text-slate-850 dark:text-slate-150">
          {formatRupiah(item.total)}
        </span>
      ),
    },
    {
      header: "Calculated Margins",
      sortKey: "untung" as keyof Purchase,
      accessor: (item: Purchase) => (
        <div className="flex flex-col text-right">
          <span className="text-xs font-bold text-foreground">
            +{formatRupiah(item.untung)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {item.persen ? `${item.persen}% margin` : "-"}
          </span>
        </div>
      ),
    },
    ...(activeTab === "non-pt"
      ? [
          {
            header: "COA Halal",
            sortKey: "coa_halal" as keyof Purchase,
            accessor: (item: Purchase) => (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider
                  ${
                    item.coa_halal === "Y"
                      ? "bg-zinc-100 dark:bg-zinc-800 border-border-custom text-foreground"
                      : "bg-red-500/10 border-red-500/20 text-accent-red"
                  }`}
              >
                Halal: {item.coa_halal || "N"}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Purchases PO Journal
          </h1>
          <p className="text-xs text-slate-555 mt-0.5">
            View procurement streams, vendor logs, DPP items, and profit margin analysis.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-background rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create {activeTab === "pt" ? "PT PO" : "Non-PT PO"}</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center border-b border-border-custom">
        <button
          onClick={() => setActiveTab("pt")}
          className={`px-4 py-2.5 font-semibold text-xs tracking-wide transition-colors relative cursor-pointer
            ${activeTab === "pt" ? "text-foreground" : "text-slate-450 hover:text-slate-700 dark:hover:text-slate-200"}`}
        >
          PT Purchases
          {activeTab === "pt" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("non-pt")}
          className={`px-4 py-2.5 font-semibold text-xs tracking-wide transition-colors relative cursor-pointer
            ${activeTab === "non-pt" ? "text-foreground" : "text-slate-450 hover:text-slate-700 dark:hover:text-slate-200"}`}
        >
          Non-PT Purchases
          {activeTab === "non-pt" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
          )}
        </button>
      </div>

      {/* Filter and controls */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs text-slate-400 font-medium">Filter by Year:</span>
        {["2022", "2023", "2024", "2025", "2026"].map((yr) => (
          <button
            key={yr}
            onClick={() => setSelectedYear(yr)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-colors
              ${
                selectedYear === yr
                  ? "bg-primary-light text-primary border-primary/20"
                  : "border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
          >
            {yr}
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
        <div className="p-3.5 rounded-xl border bg-zinc-100 dark:bg-zinc-900 border-border-custom text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Datatable */}
      <Table
        columns={columns}
        data={sortedGroupedData}
        isLoading={isLoading}
        searchPlaceholder="Search POs by PO number, vendor, or product..."
        searchFilter={(item: any, query) =>
          (item.no_po ? item.no_po.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.vendor ? item.vendor.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.barang ? item.barang.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.allGroupItems?.some((gi: any) => gi.barang && gi.barang.toLowerCase().includes(query.toLowerCase())) || false)
        }
        actions={(item: any) => (
          <>
            <button
              type="button"
              onClick={() => handleViewPo(item.no_po)}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-855 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="View PO Items"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.open(`/purchases/print?poNo=${encodeURIComponent(item.no_po)}&tab=${activeTab}`, "_blank")}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 hover:text-slate-900 dark:hover:text-slate-150 transition-colors cursor-pointer"
              title="Print Purchase Order"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleEditPo(item.no_po)}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-885 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Edit PO"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeletePo(item.no_po, item.allGroupItems)}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-accent-red transition-colors cursor-pointer"
              title="Delete PO"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      />

      {/* Dynamic PO Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedPoNumber ? `Edit PO Number: ${selectedPoNumber}` : `Create New ${activeTab === "pt" ? "PT PO" : "Non-PT PO"}`}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {poLimitError && (
            <div className="p-3 rounded-xl border bg-red-500/10 text-accent-red border-red-500/20 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{poLimitError}</span>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border-custom pb-1.5">
              Purchase PO Header Info
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">PO Number</label>
                <input
                  type="text"
                  required
                  readOnly={!!selectedPoNumber}
                  placeholder="e.g. SLP/PO/0124/0001"
                  {...register("no_po")}
                  className={`w-full px-3 py-2 border border-border-custom rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20
                    ${selectedPoNumber 
                      ? "bg-slate-100 dark:bg-zinc-800/80 cursor-not-allowed text-slate-700 dark:text-slate-350" 
                      : "bg-card-bg text-foreground"
                    }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Vendor Supplier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Barentz Indonesia"
                  list="purchases-vendors-list"
                  {...register("vendor")}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">PO Date</label>
                <input
                  type="date"
                  required
                  {...register("tgl_po")}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Receipt Date</label>
                <input
                  type="date"
                  required
                  {...register("tgl_terima_barang")}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Payment Date</label>
                <input
                  type="date"
                  required
                  {...register("tgl_bayar")}
                  className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Memo Remarks (Note)</label>
              <textarea
                {...register("note")}
                rows={1.5}
                placeholder="e.g. PO Urgent shipment from warehouse..."
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* DYNAMIC FIELD ARRAY FOR PO ITEMS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-custom pb-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                PO Goods & Margins List ({fields.length} of 12)
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (fields.length >= 12) return;
                  append({
                    no_urut: fields.length + 1,
                    kode_barang: products[0]?.kode_product || "",
                    barang: products[0]?.nama_product || "",
                    qty_kg: 0,
                    qty_terima_kg: 0,
                    dpp: 0,
                    harga: 0,
                    total: 0,
                    jual: 0,
                    total_jual: 0,
                    untung: 0,
                    persen: 0,
                    coa_halal: "Y",
                  });
                }}
                disabled={fields.length >= 12}
                className="px-3 py-1.5 bg-primary-light hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Goods Row</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {fields.map((field, index) => {
                const itemQty = Number(watchedItems?.[index]?.qty_kg) || 0;
                const itemHarga = Number(watchedItems?.[index]?.harga) || 0;
                const itemTotal = itemQty * itemHarga;
                const itemDpp = Number(watchedItems?.[index]?.dpp) || Math.round((itemHarga / 1.11) * 100) / 100;
                
                const itemJual = watchedItems?.[index]?.jual ? Number(watchedItems?.[index]?.jual) : 0;
                const itemTotalJual = itemQty * itemJual;
                const itemProfit = itemJual > 0 ? itemTotalJual - itemTotal : 0;
                const itemMargin = itemTotal > 0 ? Math.round((itemProfit / itemTotal) * 10000) / 100 : 0;

                return (
                  <div
                    key={field.id}
                    className="p-4 rounded-xl border border-border-custom bg-slate-50/50 dark:bg-zinc-900/30 space-y-3 relative"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Goods #{index + 1}</span>
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
                        <label className="text-[10px] font-semibold text-slate-400">Product SKU (Type/Select)</label>
                        <input
                          type="text"
                          required
                          placeholder="SKU"
                          list="purchases-products-list"
                          {...register(`items.${index}.kode_barang` as const, { required: true })}
                          onChange={(e) => {
                            const code = e.target.value;
                            setValue(`items.${index}.kode_barang`, code);
                            const matchingProd = products.find((p) => p.kode_product === code);
                            if (matchingProd) {
                              setValue(`items.${index}.barang`, matchingProd.nama_product);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs focus:ring-1 focus:ring-primary/20 focus:outline-none"
                        />
                      </div>
                      
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-semibold text-slate-400">Product Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Product Name"
                          {...register(`items.${index}.barang` as const, { required: true })}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs focus:ring-1 focus:ring-primary/20 focus:outline-none"
                        />
                      </div>

                      {activeTab === "non-pt" ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400">COA Halal</label>
                          <select
                            {...register(`items.${index}.coa_halal` as const)}
                            className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs focus:outline-none font-semibold text-slate-700"
                          >
                            <option value="Y">Halal (Y)</option>
                            <option value="N">Non-Halal (N)</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1 invisible" />
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Qty Ordered (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0"
                          {...register(`items.${index}.qty_kg` as const, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs focus:ring-1 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Qty Received (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0"
                          {...register(`items.${index}.qty_terima_kg` as const, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs focus:ring-1 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Base Unit Cost (Harga IDR)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0"
                          {...register(`items.${index}.harga` as const, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs font-semibold focus:ring-1 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">DPP Value (Exc PPN)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Calculated"
                          {...register(`items.${index}.dpp` as const, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs text-slate-500 focus:ring-1 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* MARGIN CALCULATORS AT ROW LEVEL */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-dashed border-border-custom/50 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Selling Price (Jual IDR)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Optional"
                          {...register(`items.${index}.jual` as const, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs focus:ring-1 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Total Purchase Cost</label>
                        <div className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-600">
                          {itemTotal ? formatRupiah(itemTotal) : "-"}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Estimated Profit (IDR)</label>
                        <div className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-accent-green">
                          {itemProfit ? formatRupiah(itemProfit) : "-"}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Margin Percent (%)</label>
                        <div className="w-full px-2.5 py-1.5 border border-border-custom rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-foreground">
                          {itemMargin ? `${itemMargin}%` : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {fields.length === 0 && (
                <div className="text-center py-6 text-slate-400 border border-dashed border-border-custom rounded-xl">
                  No goods listed. Click "Add Goods Row" to input procurement items.
                </div>
              )}
            </div>
            <datalist id="purchases-products-list">
              {products.map((p) => (
                <option key={p.kode_product} value={p.kode_product}>
                  {p.kode_product} — {p.nama_product}
                </option>
              ))}
            </datalist>
            <datalist id="purchases-vendors-list">
              {vendors.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>

          {/* PO SUMMARIES */}
          <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-border-custom space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border-custom pb-1.5">
              PO Financial Summaries
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Total Purchase Cost</label>
                <div className="px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm font-bold text-slate-650">
                  {formatRupiah(totalCost)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500">Total DPP (Exc PPN)</label>
                <div className="px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm font-semibold text-slate-650">
                  {formatRupiah(totalDPP)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Total Estimated Selling</label>
                <div className="px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm font-bold text-foreground">
                  {formatRupiah(totalJual)}
                </div>
              </div>
            </div>

            {totalJual > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border-custom pt-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">Estimated Profit Return (IDR)</label>
                  <div className="px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm font-bold text-accent-green">
                    {formatRupiah(totalProfit)}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">Aggregated Margin Percent</label>
                  <div className="px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-sm font-bold text-foreground">
                    {totalMargin}% profit margin
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Buttons */}
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
              disabled={actionLoading || !!poLimitError}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-background rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{selectedPoNumber ? "Update PO" : "Register PO"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View PO Items Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewPoNo(null);
        }}
        title={`Purchase Order Details: ${viewPoNo || ""}`}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6">
          {viewPoItems.length > 0 && firstViewPoItem ? (
            <>
              {/* Header Info */}
              <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-border-custom">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border-custom pb-1.5 mb-3">
                  PO Header Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block font-sans">Vendor Supplier:</span>
                    <span className="font-bold text-foreground text-sm">{firstViewPoItem.vendor}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block font-sans">PO Date:</span>
                    <span className="font-medium text-foreground">{firstViewPoItem.tgl_po}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block font-sans">Receipt & Payment:</span>
                    <span className="text-slate-400 font-semibold block mt-0.5">
                      Recv: <span className="text-foreground font-medium">{firstViewPoItem.tgl_terima_barang}</span>
                    </span>
                    <span className="text-slate-400 font-semibold block mt-0.5">
                      Paid: <span className="text-foreground font-medium">{firstViewPoItem.tgl_bayar}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block font-sans">Memo Remarks:</span>
                    <p className="text-slate-650 dark:text-slate-350 italic mt-0.5">
                      {firstViewPoItem.note || "No memo remarks."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-border-custom rounded-xl overflow-hidden bg-card-bg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-450 uppercase tracking-wider font-semibold border-b border-border-custom bg-slate-50 dark:bg-zinc-900/50">
                      <th className="py-2.5 px-3 w-12 text-center font-sans">No</th>
                      <th className="py-2.5 px-3 font-sans">Unique Code</th>
                      <th className="py-2.5 px-3 font-sans">Product Description</th>
                      <th className="py-2.5 px-3 text-right font-sans">Qty Ordered</th>
                      <th className="py-2.5 px-3 text-right font-sans">Qty Received</th>
                      <th className="py-2.5 px-3 text-right font-sans">Unit Price</th>
                      <th className="py-2.5 px-3 text-right font-sans">Total Cost</th>
                      {viewPoItems.some(i => i.jual) && (
                        <>
                          <th className="py-2.5 px-3 text-right font-sans">Selling Price</th>
                          <th className="py-2.5 px-3 text-right font-sans">Profit</th>
                          <th className="py-2.5 px-3 text-right font-sans">Margin (%)</th>
                        </>
                      )}
                      {activeTab === "non-pt" && <th className="py-2.5 px-3 text-center font-sans">Halal</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom text-foreground">
                    {viewPoItems.map((item, idx) => (
                      <tr key={item.kode_unik || idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400">{item.no_urut}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{item.kode_unik}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold block">{item.barang}</span>
                          <span className="text-[10px] text-slate-400">{item.kode_barang}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">{item.qty_kg} kg</td>
                        <td className="py-2.5 px-3 text-right font-medium">{item.qty_terima_kg} kg</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(item.harga)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold font-mono">{formatRupiah(item.total)}</td>
                        {viewPoItems.some(i => i.jual) && (
                          <>
                            <td className="py-2.5 px-3 text-right font-mono">{item.jual ? formatRupiah(item.jual) : "-"}</td>
                            <td className="py-2.5 px-3 text-right font-semibold font-mono text-accent-green">
                              {item.untung ? `+${formatRupiah(item.untung)}` : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold font-mono">
                              {item.persen ? `${item.persen}%` : "-"}
                            </td>
                          </>
                        )}
                        {activeTab === "non-pt" && (
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider
                              ${item.coa_halal === "Y"
                                ? "bg-zinc-100 dark:bg-zinc-800 border-border-custom text-foreground"
                                : "bg-red-500/10 border-red-500/20 text-accent-red"
                              }`}
                            >
                              {item.coa_halal || "N"}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Price summary */}
              <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-border-custom space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border-custom pb-1.5">
                  Financial Summary Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-1 font-sans">Total Purchase Cost:</span>
                    <span className="text-sm font-black text-foreground">{formatRupiah(viewGrandTotal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-1 font-sans">Total DPP (Est):</span>
                    <span className="text-sm font-bold text-slate-650">{formatRupiah(viewTotalDpp)}</span>
                  </div>
                  {viewTotalProfit > 0 && (
                    <>
                      <div>
                        <span className="text-slate-400 block font-semibold mb-1 font-sans">Est. Profit Return:</span>
                        <span className="text-sm font-bold text-accent-green">+{formatRupiah(viewTotalProfit)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold mb-1 font-sans">Aggregated Margin:</span>
                        <span className="text-sm font-bold text-foreground">{viewAggregatedMargin}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No items found for this PO number.
            </div>
          )}

          {/* Close action */}
          <div className="pt-4 flex items-center justify-end border-t border-border-custom">
            <button
              type="button"
              onClick={() => {
                setViewModalOpen(false);
                setViewPoNo(null);
              }}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-background rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
