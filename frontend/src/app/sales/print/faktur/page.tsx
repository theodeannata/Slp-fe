"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore, Sale } from "@/lib/store";
import { api } from "@/lib/api";
import { ArrowLeft, Printer, Edit2, Check } from "lucide-react";

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

function PrintFakturContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMockMode, customers } = useAppStore();
  const invoiceNo = searchParams.get("invoiceNo");

  const [items, setItems] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable Form Parameter States
  const [editableInvoiceNo, setEditableInvoiceNo] = useState("");
  const [tglInvoice, setTglInvoice] = useState("");
  const [tglJatuhTempo, setTglJatuhTempo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [bankDetails, setBankDetails] = useState("BCA 001.733.9871\na/n Satria Lima Pangan PT");
  const [signatureName, setSignatureName] = useState("Satria");
  
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadInvoiceData = async () => {
      if (!invoiceNo) {
        setError("Missing invoiceNo query parameter.");
        setLoading(false);
        return;
      }
      try {
        let matchingSales: Sale[] = [];
        if (isMockMode) {
          const list = useAppStore.getState().sales;
          matchingSales = list.filter((s) => s.no_sj_inv === invoiceNo);
        } else {
          const list = await api.sales.list();
          matchingSales = list.filter((s: Sale) => s.no_sj_inv === invoiceNo);
        }

        if (matchingSales.length === 0) {
          throw new Error(`No invoice records found matching "${invoiceNo}"`);
        }

        setItems(matchingSales);

        // Prepopulate editable form values
        const first = matchingSales[0];
        setEditableInvoiceNo(first.no_sj_inv);
        setTglInvoice(first.tgl);
        setTglJatuhTempo(first.jatuh_tempo || first.tgl);
        setCustomerName(first.customer);

        // Find customer details from database for address lookup
        const matchingCust = customers.find(
          (c) => c.customer_id === first.id || (c.customer && first.customer && c.customer.toLowerCase() === first.customer.toLowerCase())
        );
        if (matchingCust) {
          setCustomerAddress(matchingCust.address);
        } else {
          setCustomerAddress(first.catatan || "No Address Saved");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load invoice details.");
      } finally {
        setLoading(false);
      }
    };
    loadInvoiceData();
  }, [invoiceNo, isMockMode, customers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs text-black">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold">LOADING INVOICE DATABASE RECORDS...</p>
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
  const totalExc = items.reduce((acc, curr) => acc + ((curr.qty_kg || 0) * (curr.harga_exc || 0)), 0);
  const totalPPN = items.reduce((acc, curr) => acc + (curr.ppn || 0), 0);
  const totalInc = items.reduce((acc, curr) => acc + (curr.total_include || 0), 0);

  const hasPPN = totalPPN > 0;

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "0";
    return num.toLocaleString("id-ID");
  };

  // Safe sizing grid always padding up to 8 rows
  const emptyRowsCount = Math.max(0, 8 - items.length);

  return (
    <div className="min-h-screen bg-zinc-150 py-8 px-4 text-black print:bg-white print:py-0 print:px-0">
      
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
            <button
              onClick={() => router.back()}
              className="p-2 border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xs font-bold uppercase">Print Invoice</h1>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{invoiceNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-1.5 border border-zinc-400 rounded-lg hover:bg-zinc-100 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {isEditing ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Done Editing</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Invoice Text</span>
                </>
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>

        {/* Editing Controls */}
        {isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-200 pt-4 text-xs">
            <div className="space-y-2">
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Invoice Number:</span>
                <input
                  type="text"
                  value={editableInvoiceNo}
                  onChange={(e) => setEditableInvoiceNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs font-mono"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Tanggal Invoice:</span>
                <input
                  type="date"
                  value={tglInvoice}
                  onChange={(e) => setTglInvoice(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Jatuh Tempo:</span>
                <input
                  type="date"
                  value={tglJatuhTempo}
                  onChange={(e) => setTglJatuhTempo(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Customer Name:</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs font-bold"
                />
              </label>
            </div>
            <div className="space-y-2">
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Customer Address:</span>
                <textarea
                  value={customerAddress}
                  rows={2}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs font-mono resize-y"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Bank Account Info:</span>
                <textarea
                  value={bankDetails}
                  rows={2}
                  onChange={(e) => setBankDetails(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs font-mono"
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

      {/* Compact A4 Page container with outer border inline with table border */}
      {/* Font Scaled by 0.85 (11pt * 0.85 = 9.35pt) */}
      <div
        className="print-a4-page w-[186mm] mx-auto bg-white border border-black py-8 pb-12 px-0 flex flex-col box-border"
        style={{
          fontFamily: 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif',
          fontSize: '9.35pt'
        }}
      >

        <div>
          {/* Header (Logo + NOT bold Title in Cambria 23.8pt (28pt * 0.85)) */}
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
              FAKTUR PENJUALAN
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 px-8">
            {/* Customer Details - Name reduced by 25% to 15.9pt (25 * 0.75 * 0.85) */}
            <div className="space-y-1">
              <div style={{ fontSize: '9.35pt' }}>Kepada Yth :</div>
              <div style={{ fontSize: '15.9pt' }} className="font-bold leading-tight mb-1">{customerName}</div>
              <div style={{ fontSize: '9.35pt' }} className="max-w-xs whitespace-pre-line leading-normal text-zinc-800 font-semibold">
                {customerAddress}
              </div>
            </div>

            {/* Invoice Metadata details */}
            <div className="pl-6 border-l border-zinc-200 flex flex-col justify-start" style={{ fontSize: '9.35pt' }}>
              <div className="grid grid-cols-[130px_10px_1fr] py-0.5">
                <span>Nomor Invoice</span>
                <span>:</span>
                <span className="font-bold">{editableInvoiceNo}</span>
              </div>
              <div className="grid grid-cols-[130px_10px_1fr] py-0.5">
                <span>Tanggal Invoice</span>
                <span>:</span>
                <span>{formatDateIndo(tglInvoice)}</span>
              </div>
              <div className="grid grid-cols-[130px_10px_1fr] py-0.5">
                <span>Jatuh Tempo</span>
                <span>:</span>
                <span>{formatDateIndo(tglJatuhTempo)}</span>
              </div>
            </div>
          </div>

          {/* Invoice Items Table (Tops/bottoms bordered, table-fixed layout for perfect column alignment) */}
          <div className="border-t border-b border-black mb-0 overflow-hidden" style={{ fontSize: '9.35pt' }}>
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="border-b border-black font-bold uppercase" style={{ fontSize: '9.35pt' }}>
                  <th className="py-2 px-1 w-[5%] text-center border-r border-black">No</th>
                  <th className="py-2 px-2 text-right w-[13%] border-r border-black">JUMLAH (KG)</th>
                  <th className="py-2 px-4 text-left w-[42%] border-r border-black">NAMA BARANG</th>
                  <th className="py-2 px-2 text-right w-[20%] border-r border-black">Harga satuan</th>
                  <th className="py-2 px-2 text-right w-[20%]">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const rowExc = item.harga_exc || 0;
                  const rowTotal = (item.qty_kg || 0) * rowExc;
                  return (
                    <tr key={idx} className="h-7">
                      <td className="text-center border-r border-black py-0.5 px-1">{idx + 1}</td>
                      <td className="text-right border-r border-black py-0.5 px-2">
                        {formatNumber(item.qty_kg)}
                      </td>
                      <td className="text-left border-r border-black py-0.5 px-4">
                        {item.barang}
                      </td>
                      <td className="text-right border-r border-black py-0.5 px-2">
                        Rp{formatNumber(rowExc)}
                      </td>
                      <td className="text-right py-0.5 px-2">
                        Rp{formatNumber(rowTotal)}
                      </td>
                    </tr>
                  );
                })}
                {/* Pad empty spacer rows without horizontal lines */}
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

          {/* Spellout (Terbilang) & Totals Section - Align dividers with table columns above */}
          {/* Using flex items-stretch to align vertical lines to table-fixed columns */}
          <div className="flex border-b border-black items-stretch" style={{ fontSize: '9.35pt' }}>
            {/* Terbilang block - spans exactly 60% width (indented pl-8) */}
            <div className="w-[60%] border-r border-black p-3 pl-8 flex flex-col justify-between">
              <div>
                <span className="font-bold italic">Terbilang :</span>
                <p className="italic font-semibold mt-2 lowercase whitespace-normal leading-normal pr-4">
                  {terbilang(hasPPN ? totalInc : totalExc).toLowerCase()}
                </p>
              </div>
              {items[0].catatan2 && (
                <div className="text-[10px] text-zinc-500 mt-2 italic">
                  Catatan: {items[0].catatan2}
                </div>
              )}
            </div>

            {/* Total labels column - 20% width (aligns with Harga Satuan column) */}
            <div className="w-[20%] border-r border-black py-2 px-2.5 flex flex-col justify-between font-calibri font-normal">
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

            {/* Total values column - 20% width (aligns with TOTAL column) */}
            <div className="w-[20%] py-2 px-2.5 flex flex-col justify-between text-right font-normal">
              {hasPPN ? (
                <>
                  <span>Rp{formatNumber(totalExc)}</span>
                  <span>Rp{formatNumber(totalPPN)}</span>
                  <span className="font-bold">Rp{formatNumber(totalInc)}</span>
                </>
              ) : (
                <>
                  <span>Rp{formatNumber(totalExc)}</span>
                  <span className="font-bold">Rp{formatNumber(totalExc)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Payment instructions & Signatures - snug below with clean margin, indented px-8 */}
        {/* Date and Signature spaced out by space-y-24 and padded at the bottom */}
        <div className="grid grid-cols-2 gap-4 pt-4 mt-6 px-8 pb-4" style={{ fontSize: '9.35pt' }}>
          <div className="text-zinc-750 space-y-1 leading-normal">
            <p className="font-bold text-black">Pembayaran dapat ditransfer ke :</p>
            <p className="font-bold text-black whitespace-pre-line leading-relaxed">
              {bankDetails}
            </p>
          </div>

          <div className="text-center ml-auto w-52 space-y-24">
            <div>
              <p className="text-zinc-650">Jakarta, {formatDateIndo(tglInvoice)}</p>
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

export default function PrintFaktur() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold">LOADING...</p>
        </div>
      </div>
    }>
      <PrintFakturContent />
    </Suspense>
  );
}
