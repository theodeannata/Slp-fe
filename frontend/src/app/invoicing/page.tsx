"use client";

import { useState, useEffect } from "react";
import { useAppStore, Sale, Purchase } from "@/lib/store";
import { api } from "@/lib/api";
import {
  FileText,
  Printer,
  Search,
  AlertCircle,
  ClipboardList,
} from "lucide-react";

const DEFAULT_VEHICLES = [
  { plate: "B 9608 BRV", label: "B 9608 BRV (Truck)" },
  { plate: "B 2035  PON", label: "B 2035  PON (Xenia Merah)" },
  { plate: "B 9362 TAQ", label: "B 9362 TAQ (GRANDMAX)" }
];

export default function InvoicingPage() {
  const { sales, purchasesPT, purchasesNonPT, isMockMode, role } = useAppStore();
  const [activeCenterTab, setActiveCenterTab] = useState<"sales" | "purchases">("sales");

  // Invoice / Sales states
  const [invoiceNumbers, setInvoiceNumbers] = useState<string[]>([]);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState("");
  const [matchingInvoiceItems, setMatchingInvoiceItems] = useState<Sale[]>([]);

  // Purchase Order states
  const [poList, setPoList] = useState<{ no_po: string; tab: "pt" | "non-pt"; vendor: string; tgl: string }[]>([]);
  const [selectedPoNo, setSelectedPoNo] = useState("");
  const [selectedPoTab, setSelectedPoTab] = useState<"pt" | "non-pt">("pt");
  const [matchingPoItems, setMatchingPoItems] = useState<Purchase[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vehicle Selection & Customization
  const [vehicles, setVehicles] = useState<{ plate: string; label: string }[]>(DEFAULT_VEHICLES);
  const [selectedVehicle, setSelectedVehicle] = useState(DEFAULT_VEHICLES[0].plate);
  const [customPlate, setCustomPlate] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Tab change handler
  const handleTabChange = (tab: "sales" | "purchases") => {
    setActiveCenterTab(tab);
    setSearchQuery("");
    setError(null);
    setSelectedInvoiceNo("");
    setMatchingInvoiceItems([]);
    setSelectedPoNo("");
    setMatchingPoItems([]);
  };

  // Load Sales Invoice list
  useEffect(() => {
    const loadInvoiceNumbers = async () => {
      if (activeCenterTab !== "sales") return;
      setLoading(true);
      setError(null);
      try {
        let allSales: Sale[] = [];
        if (isMockMode) {
          allSales = useAppStore.getState().sales;
        } else {
          allSales = await api.sales.list();
        }
        // Group by no_sj_inv
        const uniqueNos = Array.from(new Set(allSales.map((s) => s.no_sj_inv).filter(Boolean)));
        setInvoiceNumbers(uniqueNos);
      } catch (err: any) {
        setError(err.message || "Failed to load invoice list from database.");
      } finally {
        setLoading(false);
      }
    };
    loadInvoiceNumbers();
  }, [isMockMode, sales, activeCenterTab]);

  // Load Purchase Orders list
  useEffect(() => {
    const loadPoNumbers = async () => {
      if (activeCenterTab !== "purchases" || role !== "master") return;
      setLoading(true);
      setError(null);
      try {
        let ptList: Purchase[] = [];
        let nonPtList: Purchase[] = [];
        if (isMockMode) {
          ptList = useAppStore.getState().purchasesPT;
          nonPtList = useAppStore.getState().purchasesNonPT;
        } else {
          const [pt, nonPt] = await Promise.all([
            api.purchases.listPT(),
            api.purchases.listNonPT(),
          ]);
          ptList = pt;
          nonPtList = nonPt;
        }

        // Group by no_po to gather metadata
        const poMap = new Map<string, { no_po: string; tab: "pt" | "non-pt"; vendor: string; tgl: string }>();

        ptList.forEach((p) => {
          if (p.no_po && !poMap.has(p.no_po)) {
            poMap.set(p.no_po, {
              no_po: p.no_po,
              tab: "pt",
              vendor: p.vendor || "",
              tgl: p.tgl_po || p.tgl_terima_barang || "",
            });
          }
        });

        nonPtList.forEach((p) => {
          if (p.no_po && !poMap.has(p.no_po)) {
            poMap.set(p.no_po, {
              no_po: p.no_po,
              tab: "non-pt",
              vendor: p.vendor || "",
              tgl: p.tgl_po || p.tgl_terima_barang || "",
            });
          }
        });

        setPoList(Array.from(poMap.values()));
      } catch (err: any) {
        setError(err.message || "Failed to load purchase orders from database.");
      } finally {
        setLoading(false);
      }
    };
    loadPoNumbers();
  }, [isMockMode, role, purchasesPT, purchasesNonPT, activeCenterTab]);

  // Load vehicles from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sj_vehicles");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setVehicles(parsed);
            setSelectedVehicle(parsed[0].plate);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleVehicleChange = (value: string) => {
    if (value === "__new__") {
      setShowCustomInput(true);
      setCustomPlate("");
      setCustomLabel("");
    } else {
      setSelectedVehicle(value);
      setShowCustomInput(false);
    }
  };

  const handleAddCustomVehicle = () => {
    const plateUpper = customPlate.trim().toUpperCase();
    const labelTrimmed = customLabel.trim();
    if (!plateUpper) return;

    const fullLabel = labelTrimmed ? `${plateUpper} (${labelTrimmed})` : plateUpper;
    
    // Check if plate already exists in list
    const exists = vehicles.find((v) => v.plate === plateUpper);
    let updated = [...vehicles];
    
    if (!exists) {
      const newVehicle = { plate: plateUpper, label: fullLabel };
      updated = [...vehicles, newVehicle];
      setVehicles(updated);
    } else {
      updated = vehicles.map((v) => v.plate === plateUpper ? { ...v, label: fullLabel } : v);
      setVehicles(updated);
    }
    
    if (typeof window !== "undefined") {
      localStorage.setItem("sj_vehicles", JSON.stringify(updated));
    }
    setSelectedVehicle(plateUpper);
    setShowCustomInput(false);
    setCustomPlate("");
    setCustomLabel("");
  };

  // Select Invoice handler
  const handleSelectInvoice = async (invoiceNo: string) => {
    setSelectedInvoiceNo(invoiceNo);
    setSearchQuery(invoiceNo);
    setError(null);
    if (!invoiceNo) {
      setMatchingInvoiceItems([]);
      return;
    }

    setLoading(true);
    try {
      let matching: Sale[] = [];
      if (isMockMode) {
        const list = useAppStore.getState().sales;
        matching = list.filter((s) => s.no_sj_inv === invoiceNo);
      } else {
        const list = await api.sales.list();
        matching = list.filter((s: Sale) => s.no_sj_inv === invoiceNo);
      }
      setMatchingInvoiceItems(matching);
    } catch (err: any) {
      setError(err.message || "Failed to load invoice details.");
      setMatchingInvoiceItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Select PO handler
  const handleSelectPo = async (poNo: string, tab: "pt" | "non-pt") => {
    setSelectedPoNo(poNo);
    setSelectedPoTab(tab);
    setSearchQuery(poNo);
    setError(null);
    if (!poNo) {
      setMatchingPoItems([]);
      return;
    }

    setLoading(true);
    try {
      let matching: Purchase[] = [];
      if (isMockMode) {
        const list = tab === "pt"
          ? useAppStore.getState().purchasesPT
          : useAppStore.getState().purchasesNonPT;
        matching = list.filter((p) => p.no_po === poNo);
      } else {
        const list = tab === "pt"
          ? await api.purchases.listPT()
          : await api.purchases.listNonPT();
        matching = list.filter((p: Purchase) => p.no_po === poNo);
      }
      setMatchingPoItems(matching);
    } catch (err: any) {
      setError(err.message || "Failed to load purchase order details.");
      setMatchingPoItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Filters
  const filteredInvoiceNumbers = invoiceNumbers.filter((no) =>
    (no || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPoNumbers = poList.filter((item) =>
    (item.no_po || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.vendor || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sales Totals
  const firstInvoiceItem = matchingInvoiceItems[0];
  const invoiceGrandTotal = matchingInvoiceItems.reduce((acc, curr) => acc + (curr.total_include || 0), 0);

  // PO Totals
  const firstPoItem = matchingPoItems[0];
  const poTotalCost = matchingPoItems.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const poTotalDPP = matchingPoItems.reduce((acc, curr) => acc + ((curr.qty_kg || 0) * (curr.dpp || 0)), 0);
  const poTotalPPN = Math.max(0, poTotalCost - poTotalDPP);
  const poHasPPN = poTotalPPN > 0 && selectedPoTab === "pt";

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handlePrintFaktur = () => {
    if (!selectedInvoiceNo) return;
    window.open(`/sales/print/faktur?invoiceNo=${encodeURIComponent(selectedInvoiceNo)}`, "_blank");
  };

  const handlePrintSjTt = () => {
    if (!selectedInvoiceNo) return;
    window.open(`/sales/print/sj-tt?invoiceNo=${encodeURIComponent(selectedInvoiceNo)}&vehicle=${encodeURIComponent(selectedVehicle)}`, "_blank");
  };

  const handlePrintPo = () => {
    if (!selectedPoNo) return;
    window.open(`/purchases/print?poNo=${encodeURIComponent(selectedPoNo)}&tab=${selectedPoTab}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="border-b border-border-custom pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Invoicing & Print Center</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Select, preview, and generate print documents for corporate Sales Invoices, Surat Jalan, and Purchase Orders.
        </p>
      </div>

      {/* Tab Switcher (Only visible for Master account holders since PO is master-only) */}
      {role === "master" && (
        <div className="flex items-center border-b border-border-custom">
          <button
            onClick={() => handleTabChange("sales")}
            className={`px-4 py-2.5 font-bold text-xs tracking-wide transition-colors relative cursor-pointer
              ${activeCenterTab === "sales" ? "text-foreground" : "text-slate-450 hover:text-slate-700 dark:hover:text-slate-200"}`}
          >
            Sales Invoices
            {activeCenterTab === "sales" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
          <button
            onClick={() => handleTabChange("purchases")}
            className={`px-4 py-2.5 font-bold text-xs tracking-wide transition-colors relative cursor-pointer
              ${activeCenterTab === "purchases" ? "text-foreground" : "text-slate-450 hover:text-slate-700 dark:hover:text-slate-200"}`}
          >
            Purchase Orders (PO)
            {activeCenterTab === "purchases" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl border bg-red-500/10 text-accent-red border-red-500/20 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selector Column */}
        <div className="border border-border-custom bg-card-bg p-6 rounded-2xl shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-sm text-foreground">
            {activeCenterTab === "sales" ? "Select Invoice" : "Select Purchase Order"}
          </h3>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={activeCenterTab === "sales" ? "Search Invoice ID..." : "Search PO No / Vendor..."}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeCenterTab === "sales") {
                  if (selectedInvoiceNo && selectedInvoiceNo !== e.target.value) {
                    setSelectedInvoiceNo("");
                    setMatchingInvoiceItems([]);
                  }
                } else {
                  if (selectedPoNo && selectedPoNo !== e.target.value) {
                    setSelectedPoNo("");
                    setMatchingPoItems([]);
                  }
                }
              }}
              className="w-full pl-9 pr-4 py-2 border border-border-custom rounded-xl bg-card-bg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
            />
          </div>

          {/* Matches List */}
          <div className="border border-border-custom rounded-xl max-h-[300px] overflow-y-auto divide-y divide-border-custom bg-card-bg/40">
            {activeCenterTab === "sales" ? (
              <>
                {filteredInvoiceNumbers.map((no) => (
                  <button
                    key={no}
                    onClick={() => handleSelectInvoice(no)}
                    className={`w-full text-left px-4 py-3 text-xs font-semibold font-mono hover:bg-slate-50 dark:hover:bg-zinc-900/50 block transition-colors cursor-pointer
                      ${selectedInvoiceNo === no ? "bg-primary-light text-primary border-r-2 border-primary" : "text-foreground"}`}
                  >
                    {no}
                  </button>
                ))}
                {filteredInvoiceNumbers.length === 0 && (
                  <div className="p-4 text-center text-slate-450 text-[10px]">
                    No invoices found
                  </div>
                )}
              </>
            ) : (
              <>
                {filteredPoNumbers.map((item) => (
                  <button
                    key={item.no_po}
                    onClick={() => handleSelectPo(item.no_po, item.tab)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-900/50 block transition-colors cursor-pointer
                      ${selectedPoNo === item.no_po ? "bg-primary-light text-primary border-r-2 border-primary" : "text-foreground"}`}
                  >
                    <div className="text-xs font-bold font-mono">{item.no_po}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">{item.vendor}</div>
                  </button>
                ))}
                {filteredPoNumbers.length === 0 && (
                  <div className="p-4 text-center text-slate-450 text-[10px]">
                    No purchase orders found
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Panel and Document Preview */}
        <div className="md:col-span-2 space-y-6">
          {activeCenterTab === "sales" ? (
            selectedInvoiceNo ? (
              <div className="space-y-6">
                {/* Document Actions Card */}
                <div className="border border-border-custom bg-card-bg p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-foreground">Print Options</h3>
                  
                  {/* Vehicle selection dropdown */}
                  <div className="space-y-2 border-b border-border-custom/50 pb-4">
                    <label className="block text-[11px] font-bold text-slate-400">
                      Surat Jalan Vehicle / License Plate
                    </label>
                    <div className="flex flex-col gap-2.5">
                      <select
                        value={showCustomInput ? "__new__" : selectedVehicle}
                        onChange={(e) => handleVehicleChange(e.target.value)}
                        className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      >
                        {vehicles.map((v) => (
                          <option key={v.plate} value={v.plate}>
                            {v.label}
                          </option>
                        ))}
                        <option value="__new__">+ Add Custom / New Vehicle...</option>
                      </select>
                      
                      {showCustomInput && (
                        <div className="p-3 border border-border-custom/80 rounded-xl bg-slate-50/55 dark:bg-zinc-900/55 space-y-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Add New Vehicle</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Plate (e.g. B 1234 XYZ)"
                              value={customPlate}
                              onChange={(e) => setCustomPlate(e.target.value)}
                              className="px-3 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase font-mono"
                            />
                            <input
                              type="text"
                              placeholder="Name/Type (e.g. Avanza)"
                              value={customLabel}
                              onChange={(e) => setCustomLabel(e.target.value)}
                              className="px-3 py-1.5 border border-border-custom rounded-lg bg-card-bg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCustomInput(false);
                                setSelectedVehicle(vehicles[0]?.plate || DEFAULT_VEHICLES[0].plate);
                              }}
                              className="px-3 py-1.5 border border-border-custom hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAddCustomVehicle}
                              className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              Save Vehicle
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Faktur Penjualan Button */}
                    <button
                      onClick={handlePrintFaktur}
                      className="p-5 border border-border-custom rounded-2xl bg-card-bg hover:border-zinc-400 dark:hover:border-zinc-750 text-left transition-all group flex flex-col justify-between h-32 cursor-pointer shadow-sm"
                    >
                      <div className="w-9 h-9 border border-border-custom rounded-xl bg-slate-50 dark:bg-zinc-900 flex items-center justify-center text-foreground group-hover:scale-105 transition-transform">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Faktur Penjualan</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Corporate Sales Invoice template.</p>
                      </div>
                    </button>

                    {/* Surat Jalan Button */}
                    <button
                      onClick={handlePrintSjTt}
                      className="p-5 border border-border-custom rounded-2xl bg-card-bg hover:border-zinc-400 dark:hover:border-zinc-750 text-left transition-all group flex flex-col justify-between h-32 cursor-pointer shadow-sm"
                    >
                      <div className="w-9 h-9 border border-border-custom rounded-xl bg-slate-50 dark:bg-zinc-900 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Surat Jalan + Tanda Terima</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium font-sans">Delivery Order with Acknowledgement.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Data Details Preview */}
                <div className="border border-border-custom bg-card-bg p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-border-custom pb-3">
                    <ClipboardList className="w-4.5 h-4.5 text-slate-450" />
                    <h3 className="font-bold text-sm text-foreground">Invoice Database Records</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-450 font-semibold">Customer:</p>
                      <p className="font-bold text-foreground mt-0.5">{firstInvoiceItem?.customer}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {firstInvoiceItem?.id}</p>
                    </div>
                    <div>
                      <p className="text-slate-450 font-semibold">Date issued:</p>
                      <p className="font-bold text-foreground mt-0.5">{firstInvoiceItem?.tgl}</p>
                      <p className="text-[10px] text-slate-400">Due date: {firstInvoiceItem?.jatuh_tempo}</p>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="border border-border-custom rounded-xl overflow-hidden mt-4">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-450 uppercase tracking-wider font-semibold border-b border-border-custom bg-slate-50 dark:bg-zinc-900/50">
                          <th className="py-2 px-3">Item SKU</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3 text-right">Qty (KG)</th>
                          <th className="py-2 px-3 text-right">Price Exc. PPN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-custom text-foreground font-medium">
                        {matchingInvoiceItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-mono text-zinc-500">{item.kode_barang}</td>
                            <td className="py-2.5 px-3 font-semibold">{item.barang}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{item.qty_kg?.toLocaleString("id-ID")} kg</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(item.harga_exc || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-border-custom flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Aggregated Invoice total:</span>
                    <span className="text-foreground text-sm font-black">{formatRupiah(invoiceGrandTotal)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-border-custom p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[300px] text-slate-450 bg-card-bg/20">
                <FileText className="w-10 h-10 mb-4 text-slate-350" />
                <p className="text-xs font-bold text-foreground">No Invoice Selected</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs font-medium">
                  Select or type an invoice number from the left panel to load the database records and preview the print options.
                </p>
              </div>
            )
          ) : (
            selectedPoNo ? (
              <div className="space-y-6">
                {/* PO Document Actions Card */}
                <div className="border border-border-custom bg-card-bg p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-foreground">Print Options</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Print Purchase Order Button */}
                    <button
                      onClick={handlePrintPo}
                      className="p-5 border border-border-custom rounded-2xl bg-card-bg hover:border-zinc-400 dark:hover:border-zinc-750 text-left transition-all group flex flex-col justify-between h-32 cursor-pointer shadow-sm"
                    >
                      <div className="w-9 h-9 border border-border-custom rounded-xl bg-slate-50 dark:bg-zinc-900 flex items-center justify-center text-foreground group-hover:scale-105 transition-transform">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Print Purchase Order</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Official corporate Purchase Order printout template.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* PO Data Details Preview */}
                <div className="border border-border-custom bg-card-bg p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-border-custom pb-3">
                    <ClipboardList className="w-4.5 h-4.5 text-slate-450" />
                    <h3 className="font-bold text-sm text-foreground">PO Database Records</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-450 font-semibold">Vendor / Supplier:</p>
                      <p className="font-bold text-foreground mt-0.5">{firstPoItem?.vendor}</p>
                      <p className="text-[10px] text-slate-400">Stream: {selectedPoTab === "pt" ? "PT Purchase" : "Non-PT Purchase"}</p>
                    </div>
                    <div>
                      <p className="text-slate-450 font-semibold">Date issued:</p>
                      <p className="font-bold text-foreground mt-0.5">{firstPoItem?.tgl_po}</p>
                      <p className="text-[10px] text-slate-400">Received date: {firstPoItem?.tgl_terima_barang || "-"}</p>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="border border-border-custom rounded-xl overflow-hidden mt-4">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-450 uppercase tracking-wider font-semibold border-b border-border-custom bg-slate-50 dark:bg-zinc-900/50">
                          <th className="py-2 px-3">Item SKU</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3 text-right">Qty (KG)</th>
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-right">Row Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-custom text-foreground font-medium">
                        {matchingPoItems.map((item, idx) => {
                          const unitPrice = selectedPoTab === "pt" ? (item.dpp || 0) : (item.harga || 0);
                          const rowTotal = (item.qty_kg || 0) * unitPrice;
                          return (
                            <tr key={idx}>
                              <td className="py-2.5 px-3 font-mono text-zinc-500">{item.kode_barang}</td>
                              <td className="py-2.5 px-3 font-semibold">{item.barang}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{item.qty_kg?.toLocaleString("id-ID")} kg</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(unitPrice)}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rowTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations breakdown block */}
                  <div className="pt-3 border-t border-border-custom text-xs space-y-1.5">
                    {poHasPPN ? (
                      <>
                        <div className="flex items-center justify-between text-slate-450">
                          <span>Subtotal (DPP):</span>
                          <span className="font-semibold text-foreground font-mono">{formatRupiah(poTotalDPP)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-450">
                          <span>PPN (11%):</span>
                          <span className="font-semibold text-foreground font-mono">{formatRupiah(poTotalPPN)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-border-custom/50">
                          <span className="text-slate-400">Grand Total (Inc. PPN):</span>
                          <span className="text-foreground text-sm font-black font-mono">{formatRupiah(poTotalCost)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400">PO Grand Total:</span>
                        <span className="text-foreground text-sm font-black font-mono">{formatRupiah(poTotalCost)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-border-custom p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[300px] text-slate-450 bg-card-bg/20">
                <FileText className="w-10 h-10 mb-4 text-slate-350" />
                <p className="text-xs font-bold text-foreground">No Purchase Order Selected</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs font-medium">
                  Select or type a purchase order number from the left panel to load the database records and preview the print options.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
