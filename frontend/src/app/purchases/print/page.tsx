"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore, Purchase } from "@/lib/store";
import { api } from "@/lib/api";
import { ArrowLeft, Printer, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// Indonesian number to words spelling utility
function terbilang(nilai: number): string {
  const bilangan = [
    "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"
  ];
  let temp = "";
  if (nilai < 12) {
    temp = " " + bilangan[Math.floor(nilai)];
  } else if (nilai < 20) {
    temp = terbilang(nilai - 10) + " belas";
  } else if (nilai < 100) {
    temp = terbilang(nilai / 10) + " puluh" + terbilang(nilai % 10);
  } else if (nilai < 200) {
    temp = " seratus" + terbilang(nilai - 100);
  } else if (nilai < 1000) {
    temp = terbilang(nilai / 100) + " ratus" + terbilang(nilai % 100);
  } else if (nilai < 2000) {
    temp = " seribu" + terbilang(nilai - 1000);
  } else if (nilai < 1000000) {
    temp = terbilang(nilai / 1000) + " ribu" + terbilang(nilai % 1000);
  } else if (nilai < 1000000000) {
    temp = terbilang(nilai / 1000000) + " juta" + terbilang(nilai % 1000000);
  } else if (nilai < 1000000000000) {
    temp = terbilang(nilai / 1000000000) + " milyar" + terbilang(nilai % 1000000000);
  } else if (nilai < 1000000000000000) {
    temp = terbilang(nilai / 1000000000000) + " trilyun" + terbilang(nilai % 1000000000000);
  }
  return temp.trim();
}

function formatDateIndo(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function PrintPoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMockMode } = useAppStore();
  const poNo = searchParams.get("poNo");
  const tab = searchParams.get("tab") || "pt";

  const [items, setItems] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable Form Parameter States
  const [editablePoNo, setEditablePoNo] = useState("");
  const [tglPo, setTglPo] = useState("");
  const [tglTerima, setTglTerima] = useState("");
  const [tglBayar, setTglBayar] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [term, setTerm] = useState("30 Hari");
  const [alamatKirim, setAlamatKirim] = useState("Aeropolis Technopark ASW.FX1");
  const [contactPerson, setContactPerson] = useState("Yanti");
  const [signatureName, setSignatureName] = useState("Satria");
  
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadPoData = async () => {
      if (!poNo) {
        setError("Missing poNo query parameter.");
        setLoading(false);
        return;
      }
      try {
        let matchingPurchases: Purchase[] = [];
        if (isMockMode) {
          const cache = useAppStore.getState();
          const list = tab === "pt" ? cache.purchasesPT : cache.purchasesNonPT;
          matchingPurchases = list.filter((p) => p.no_po === poNo);
        } else {
          const list = tab === "pt" 
            ? await api.purchases.listPT()
            : await api.purchases.listNonPT();
          matchingPurchases = list.filter((p: Purchase) => p.no_po === poNo);
        }

        if (matchingPurchases.length === 0) {
          throw new Error(`No purchase order records found matching "${poNo}"`);
        }

        setItems(matchingPurchases);

        // Prepopulate editable form values
        const first = matchingPurchases[0];
        setEditablePoNo(first.no_po);
        setTglPo(first.tgl_po);
        setTglTerima(first.tgl_terima_barang || "");
        setTglBayar(first.tgl_bayar || "");
        setVendorName(first.vendor);
        setVendorAddress(first.note || "No Address Details");
      } catch (err: any) {
        setError(err.message || "Failed to load PO details.");
      } finally {
        setLoading(false);
      }
    };
    loadPoData();
  }, [poNo, tab, isMockMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs text-black">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold">LOADING PURCHASE RECORDS...</p>
        </div>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6 font-mono text-xs text-zinc-900">
        <div className="max-w-md w-full border border-red-350 bg-white p-6 rounded-lg text-center space-y-4">
          <p className="font-bold text-red-650">Error Generating Document</p>
          <p className="text-zinc-650 leading-relaxed">{error || "No matching items found."}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-black hover:bg-zinc-100 font-semibold cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Auto-calculated totals
  const totalCost = items.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalDPP = items.reduce((acc, curr) => acc + ((curr.qty_kg || 0) * (curr.dpp || 0)), 0);
  const totalPPN = Math.max(0, totalCost - totalDPP);

  const hasPPN = totalPPN > 0 && tab === "pt";

  const formatNumber = (num: number) => {
    return num.toLocaleString("id-ID");
  };

  const emptyRowsCount = Math.max(0, 8 - items.length);

  return (
    <div className="min-h-screen bg-zinc-150 py-8 px-4 text-black print:bg-white print:py-0 print:px-0 font-sans">
      
      {/* Styles to force compact printing inside boundaries, preventing overshooting */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-a4-page {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            border: 1px solid black !important;
            padding: 10mm 0 15mm 0 !important;
            box-sizing: border-box !important;
            page-break-after: avoid;
            page-break-inside: avoid;
            display: flex !important;
            flex-direction: column !important;
          }
        }
      `}</style>

      {/* top toolbar panel (hidden on print) */}
      <div className="max-w-[200mm] mx-auto mb-6 bg-white border border-zinc-300 p-4 rounded-xl flex flex-col gap-4 shadow-sm print:hidden no-print font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              title="Go Back"
              className="h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xs font-bold uppercase">Print Purchase Order</h1>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{poNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="text-[11px] font-bold flex items-center gap-1.5"
            >
              {isEditing ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Done Editing</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit PO Text</span>
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => window.print()}
              className="text-[11px] font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PO</span>
            </Button>
          </div>
        </div>

        {/* Editing Controls */}
        {isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-200 pt-4 text-xs">
            <div className="space-y-2">
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">PO Number:</span>
                <input
                  type="text"
                  value={editablePoNo}
                  onChange={(e) => setEditablePoNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs font-mono"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Tanggal PO:</span>
                <input
                  type="date"
                  value={tglPo}
                  onChange={(e) => setTglPo(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Vendor Name:</span>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs font-bold"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Vendor Address:</span>
                <textarea
                  value={vendorAddress}
                  rows={2}
                  onChange={(e) => setVendorAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs font-mono resize-y"
                />
              </label>
            </div>
            <div className="space-y-2">
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Term of Payment:</span>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Alamat Kirim (Delivery Address):</span>
                <textarea
                  value={alamatKirim}
                  rows={2}
                  onChange={(e) => setAlamatKirim(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs resize-y"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Contact Person:</span>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Authorized Signatory Name:</span>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* A4 Page container */}
      <div 
        className="print-a4-page w-[186mm] mx-auto bg-white border border-black py-8 pb-12 px-0 flex flex-col box-border"
        style={{ 
          fontFamily: 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif', 
          fontSize: '9.35pt' 
        }}
      >
        
        <div>
          {/* Header (Logo + Title in Cambria 23.8pt) */}
          <div className="flex justify-between items-start mb-6 px-8">
            <div>
              <img 
                src="/LOGO SLP FINAL.png" 
                alt="PT Satria Lima Pangan" 
                className="w-[4.66cm] h-[2.81cm] object-contain"
              />
            </div>
            <div 
              style={{ fontFamily: 'Cambria, Georgia, serif', fontSize: '23.8pt' }}
              className="text-right uppercase tracking-wide pt-1"
            >
              PURCHASE ORDER
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 px-8">
            {/* Vendor Details */}
            <div className="space-y-1">
              <div style={{ fontSize: '9.35pt' }}>Kepada Yth :</div>
              <div style={{ fontSize: '15.9pt' }} className="font-bold leading-tight mb-1">{vendorName}</div>
              <div style={{ fontSize: '9.35pt' }} className="max-w-xs whitespace-pre-line leading-normal text-zinc-800 font-semibold">
                {vendorAddress}
              </div>
            </div>

            {/* PO Metadata details */}
            <div className="pl-6 border-l border-zinc-200 flex flex-col justify-start" style={{ fontSize: '9.35pt' }}>
              <div className="grid grid-cols-[130px_10px_1fr] py-0.5">
                <span>Nomor PO</span>
                <span>:</span>
                <span className="font-bold">{editablePoNo}</span>
              </div>
              <div className="grid grid-cols-[130px_10px_1fr] py-0.5">
                <span>Tanggal PO</span>
                <span>:</span>
                <span>{formatDateIndo(tglPo)}</span>
              </div>
              {tglTerima && (
                <div className="grid grid-cols-[130px_10px_1fr] py-0.5">
                  <span>Tanggal Terima</span>
                  <span>:</span>
                  <span>{formatDateIndo(tglTerima)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="border-t border-b border-black mb-0 overflow-hidden" style={{ fontSize: '9.35pt' }}>
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="border-b border-black font-bold uppercase" style={{ fontSize: '9.35pt' }}>
                  <th className="py-2 px-1 w-[5%] text-center border-r border-black">No</th>
                  <th className="py-2 px-2 text-right w-[15%] border-r border-black">JUMLAH (KG)</th>
                  <th className="py-2 px-4 text-left w-[50%] border-r border-black">NAMA BARANG</th>
                  <th className="py-2 px-2 text-right w-[15%] border-r border-black">Harga satuan</th>
                  <th className="py-2 px-2 text-right w-[15%]">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const rowPrice = hasPPN ? (item.dpp || 0) : (item.harga || 0);
                  const rowTotal = (item.qty_kg || 0) * rowPrice;
                  return (
                    <tr key={idx} className="h-7">
                      <td className="text-center border-r border-black py-0.5 px-1 font-mono text-zinc-655">{idx + 1}</td>
                      <td className="text-right border-r border-black py-0.5 px-2 font-mono">
                        {formatNumber(item.qty_kg)}
                      </td>
                      <td className="text-left border-r border-black py-0.5 px-4">
                        {item.barang}
                      </td>
                      <td className="text-right border-r border-black py-0.5 px-2 font-mono">
                        Rp{formatNumber(rowPrice)}
                      </td>
                      <td className="text-right py-0.5 px-2 font-mono">
                        Rp{formatNumber(rowTotal)}
                      </td>
                    </tr>
                  );
                })}
                {/* Spacer rows */}
                {Array.from({ length: emptyRowsCount }).map((_, i) => (
                  <tr key={`spacer-${i}`} className="h-7">
                    <td className="border-r border-black">&nbsp;</td>
                    <td className="border-r border-black">&nbsp;</td>
                    <td className="border-r border-black">&nbsp;</td>
                    <td className="border-r border-black">&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Spellout (Terbilang) & Totals Section */}
          <div className="flex border-b border-black items-stretch" style={{ fontSize: '9.35pt' }}>
            {/* Terbilang block */}
            <div className="w-[70%] border-r border-black p-3 pl-8 flex flex-col justify-between">
              <div>
                <span className="font-bold italic">Terbilang :</span>
                <p className="italic font-semibold mt-2 lowercase whitespace-normal leading-normal pr-4">
                  {terbilang(hasPPN ? totalCost : totalDPP).toLowerCase()} rupiah
                </p>
              </div>
            </div>

            {/* Total labels column */}
            <div className="w-[15%] border-r border-black py-2 px-2.5 flex flex-col justify-between font-calibri font-normal">
              {hasPPN ? (
                <>
                  <span>TOTAL (DPP)</span>
                  <span>PPN (11%)</span>
                  <span className="font-bold">GRAND TOTAL</span>
                </>
              ) : (
                <>
                  <span>TOTAL</span>
                  <span className="font-bold">GRAND TOTAL</span>
                </>
              )}
            </div>

            {/* Total values column */}
            <div className="w-[15%] py-2 px-2.5 flex flex-col justify-between text-right font-mono font-normal">
              {hasPPN ? (
                <>
                  <span>Rp{formatNumber(totalDPP)}</span>
                  <span>Rp{formatNumber(totalPPN)}</span>
                  <span className="font-bold">Rp{formatNumber(totalCost)}</span>
                </>
              ) : (
                <>
                  <span>Rp{formatNumber(totalCost)}</span>
                  <span className="font-bold">Rp{formatNumber(totalCost)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer info (Terms, Shipping address, CP, and signature) */}
        <div className="grid grid-cols-2 gap-4 pt-4 mt-6 px-8 pb-4" style={{ fontSize: '9.35pt' }}>
          <div className="text-zinc-750 space-y-1.5 leading-normal">
            <div className="grid grid-cols-[110px_10px_1fr] py-0.5">
              <span className="font-bold text-black">Term</span>
              <span className="font-bold text-black">:</span>
              <span className="text-black font-semibold">{term}</span>
            </div>
            <div className="grid grid-cols-[110px_10px_1fr] py-0.5">
              <span className="font-bold text-black">Alamat Kirim</span>
              <span className="font-bold text-black">:</span>
              <span className="text-black font-semibold whitespace-pre-line leading-relaxed">{alamatKirim}</span>
            </div>
            <div className="grid grid-cols-[110px_10px_1fr] py-0.5">
              <span className="font-bold text-black">Contact Person</span>
              <span className="font-bold text-black">:</span>
              <span className="text-black font-semibold">{contactPerson}</span>
            </div>
          </div>

          <div className="text-center ml-auto w-52 space-y-24">
            <div>
              <p className="text-zinc-650">Jakarta, {formatDateIndo(tglPo)}</p>
            </div>
            <div className="pb-4">
              <p className="font-bold text-black border-b border-black inline-block px-4 pb-0.5">{signatureName}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function PrintPo() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold">LOADING...</p>
        </div>
      </div>
    }>
      <PrintPoContent />
    </Suspense>
  );
}
