"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore, Sale } from "@/lib/store";
import { api } from "@/lib/api";
import { ArrowLeft, Printer, Edit2, Check } from "lucide-react";

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

function PrintSjContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMockMode } = useAppStore();
  const invoiceNo = searchParams.get("invoiceNo");

  const [items, setItems] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable states for customization
  const vehicleParam = searchParams.get("vehicle");
  const [tglInvoice, setTglInvoice] = useState("");
  const [sjNumber, setSjNumber] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [licensePlate, setLicensePlate] = useState(vehicleParam || "B 9608 BRV");
  
  const [ttYangMenyerahkan, setTtYangMenyerahkan] = useState("Yang Menyerahkan");
  const [ttPenerima, setTtPenerima] = useState("Penerima");

  const [sjGudang, setSjGudang] = useState("Gudang");
  const [sjPengemudi, setSjPengemudi] = useState("Pengemudi");
  const [sjPenerima, setSjPenerima] = useState("Penerima");

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (vehicleParam) {
      setLicensePlate(vehicleParam);
    }
  }, [vehicleParam]);

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

        const first = matchingSales[0];
        setTglInvoice(first.tgl);
        setInvNumber(first.no_sj_inv);
        const sj = first.no_sj_inv.replace("INV", "SJ");
        setSjNumber(sj);
        setCustomerName(first.customer);
      } catch (err: any) {
        setError(err.message || "Failed to load invoice details.");
      } finally {
        setLoading(false);
      }
    };
    loadInvoiceData();
  }, [invoiceNo, isMockMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs text-black">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold">LOADING DATABASE RECORDS...</p>
        </div>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6 font-mono text-xs text-black">
        <div className="max-w-md w-full border border-zinc-300 bg-white p-6 rounded-lg text-center space-y-4">
          <p className="font-bold text-red-655">Error Generating Document</p>
          <p className="text-zinc-650 leading-normal">{error || "No matching items found."}</p>
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

  const emptyRowsCount = Math.max(0, 4 - items.length);

  return (
    <div className="min-h-screen bg-zinc-150 py-8 px-4 text-black print:bg-white print:py-0 print:px-0">
      
      {/* Print settings to ensure A4 dotmatrix compatibility without overshooting */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
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
            height: 252mm !important; /* Strictly safe height to prevent overshooting default print margins */
            min-height: 252mm !important;
            margin: 0 !important;
            border: none !important;
            padding: 8mm !important;
            box-sizing: border-box !important;
            page-break-after: avoid;
            page-break-inside: avoid;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
        }
      `}</style>

      {/* Top Banner Toolbar (Hidden on print) */}
      <div className="max-w-[210mm] mx-auto mb-6 bg-white border border-zinc-300 p-4 rounded-xl flex flex-col gap-4 shadow-sm print:hidden no-print font-mono text-xs">
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
              <h1 className="text-xs font-bold uppercase">Print SJ + TT</h1>
              <p className="text-[10px] text-zinc-550 font-mono mt-0.5">{sjNumber} / {invNumber}</p>
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
                  <span>Edit Details</span>
                </>
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Page</span>
            </button>
          </div>
        </div>

        {isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-200 pt-4 text-xs">
            <div className="space-y-2">
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Surat Jalan Number:</span>
                <input
                  type="text"
                  value={sjNumber}
                  onChange={(e) => setSjNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs font-mono"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Invoice Number:</span>
                <input
                  type="text"
                  value={invNumber}
                  onChange={(e) => setInvNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs font-mono"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Tanggal Dokumen:</span>
                <input
                  type="date"
                  value={tglInvoice}
                  onChange={(e) => setTglInvoice(e.target.value)}
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
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">License Plate Number:</span>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs font-bold uppercase font-mono"
                />
              </label>
            </div>
            <div className="space-y-2">
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Yang Menyerahkan (TT):</span>
                <input
                  type="text"
                  value={ttYangMenyerahkan}
                  onChange={(e) => setTtYangMenyerahkan(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Penerima (TT):</span>
                <input
                  type="text"
                  value={ttPenerima}
                  onChange={(e) => setTtPenerima(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Gudang (SJ):</span>
                <input
                  type="text"
                  value={sjGudang}
                  onChange={(e) => setSjGudang(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Pengemudi (SJ):</span>
                <input
                  type="text"
                  value={sjPengemudi}
                  onChange={(e) => setSjPengemudi(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
              <label className="block">
                <span className="text-zinc-500 font-bold block mb-0.5">Penerima (SJ):</span>
                <input
                  type="text"
                  value={sjPenerima}
                  onChange={(e) => setSjPenerima(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-zinc-300 rounded bg-white text-xs"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Symmetric Full A4 Page Container in Lucida Fax (height constrained to safe 252mm to prevent overshoot) */}
      <div 
        className="print-a4-page w-[210mm] mx-auto bg-white border border-zinc-200 flex flex-col justify-between box-border"
        style={{ 
          fontFamily: '"Lucida Fax", "Lucida Sans", Lucida, Georgia, serif',
          fontSize: '9.35pt',
          height: '252mm',
          padding: '8mm'
        }}
      >
        
        {/* ==================== 1. TANDA TERIMA (TOP HALF) ==================== */}
        <div className="h-[46%] flex flex-col justify-between relative">
          <div>
            {/* Header info */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span style={{ fontSize: '15.3pt' }} className="font-bold uppercase">PT Satria Lima Pangan</span>
                <div className="mt-2">
                  <span style={{ fontSize: '8.5pt' }} className="text-zinc-500 block">Tanggal</span>
                  <div className="border-b border-black text-center font-bold w-36 py-0.5" style={{ fontSize: '9.35pt' }}>
                    {formatDateIndo(tglInvoice)}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <span style={{ fontSize: '15.3pt' }} className="font-bold uppercase">Tanda Terima</span>
                <div className="mt-2">
                  <span style={{ fontSize: '8.5pt' }} className="text-zinc-500 block">Kepada</span>
                  <div className="border-b border-black font-bold w-48 py-0.5" style={{ fontSize: '9.35pt' }}>
                    {customerName}
                  </div>
                </div>
              </div>
            </div>

            {/* Telah diterima clause */}
            <div className="mt-2 space-y-0.5">
              <p style={{ fontSize: '8.5pt' }}>Telah diterima dari:</p>
              <p style={{ fontSize: '10.2pt' }} className="font-bold">PT Satria Lima Pangan</p>
            </div>

            {/* Document list table */}
            <div className="mt-2 border-b border-black pb-0.5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black font-bold uppercase" style={{ fontSize: '8.5pt' }}>
                    <th className="py-1 text-left">Nama Dokumen</th>
                    <th className="py-1 text-right w-48">Nomor Dokumen</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '9.35pt' }} className="font-semibold">
                  <tr className="h-7">
                    <td>Faktur Penjualan (Asli)</td>
                    <td className="text-right font-mono">{invNumber}</td>
                  </tr>
                  {items[0]?.fp === "T" && (
                    <tr className="h-7">
                      <td>Faktur Pajak Standard</td>
                      <td className="text-right font-mono">{`FP-${invNumber.split("/").pop()}`}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures block for Tanda Terima */}
          <div className="flex justify-between text-center mt-2">
            <div className="w-[40%] whitespace-nowrap">
              <p style={{ fontSize: '8.5pt', marginBottom: '3.5rem' }} className="text-zinc-500">Yang Menyerahkan,</p>
              <p style={{ fontSize: '9.35pt' }} className="font-semibold text-black whitespace-nowrap">
                (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
              </p>
              <p style={{ fontSize: '8.5pt' }} className="text-zinc-500 mt-1 whitespace-nowrap">{ttYangMenyerahkan}</p>
            </div>
            <div className="w-[40%] whitespace-nowrap">
              <p style={{ fontSize: '8.5pt', marginBottom: '3.5rem' }} className="text-zinc-500">Penerima,</p>
              <p style={{ fontSize: '9.35pt' }} className="font-semibold text-black whitespace-nowrap">
                (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
              </p>
              <p style={{ fontSize: '8.5pt' }} className="text-zinc-500 mt-1 whitespace-nowrap">{ttPenerima}</p>
            </div>
          </div>
        </div>


        {/* ==================== 2. SURAT JALAN (BOTTOM HALF) ==================== */}
        <div className="h-[46%] flex flex-col justify-between pt-2">
          <div>
            {/* Header info */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span style={{ fontSize: '15.3pt' }} className="font-bold uppercase">PT Satria Lima Pangan</span>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center">
                    <span style={{ fontSize: '8.5pt' }} className="w-16">No.</span>
                    <span style={{ fontSize: '9.35pt' }} className="border-b border-black font-bold font-mono px-2 w-44">
                      {sjNumber}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span style={{ fontSize: '8.5pt' }} className="w-16">Tanggal</span>
                    <span style={{ fontSize: '9.35pt' }} className="border-b border-black px-2 w-44">
                      {formatDateIndo(tglInvoice)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <span style={{ fontSize: '15.3pt' }} className="font-bold uppercase">Surat Jalan</span>
                <div className="mt-2">
                  <span style={{ fontSize: '8.5pt' }} className="text-zinc-500 block">Kepada</span>
                  <div className="border-b border-black font-bold w-48 py-0.5" style={{ fontSize: '9.35pt' }}>
                    {customerName}
                  </div>
                </div>
              </div>
            </div>

            {/* License plate note */}
            <div className="mt-2" style={{ fontSize: '8.5pt' }}>
              Kami kirimkan barang di bawah ini dengan no. polisi : <strong className="border-b border-black pb-0.5 px-1 uppercase" style={{ fontSize: '9.35pt' }}>{licensePlate}</strong>
            </div>

            {/* Items Table */}
            <div className="mt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-t border-b border-black font-bold uppercase" style={{ fontSize: '8.5pt' }}>
                    <th className="py-1 w-20 text-center">Unit</th>
                    <th className="py-1 px-4 text-left">Nama Barang</th>
                    <th className="py-1 text-right w-36">Total (kg)</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '9.35pt' }} className="font-semibold">
                  {items.map((item, idx) => {
                    const packaging = item.satuan_kemasan || 25;
                    const calculatedSaks = Math.round((item.qty_kg || 0) / packaging);
                    return (
                      <tr key={idx} className="h-7">
                        <td className="text-center uppercase">{calculatedSaks} SAK</td>
                        <td className="px-4">
                          {item.barang} @{packaging} Kg
                        </td>
                        <td className="text-right font-mono">
                          {item.qty_kg?.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Spacing rows without borders */}
                  {Array.from({ length: emptyRowsCount }).map((_, i) => (
                    <tr key={`sj-spacer-${i}`} className="h-7">
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-black w-full mt-1"></div>
            </div>
          </div>

          {/* Signatures block for Surat Jalan */}
          <div className="flex justify-between text-center mt-2">
            <div className="w-[30%] whitespace-nowrap">
              <p style={{ fontSize: '8.5pt', marginBottom: '3.5rem' }} className="text-zinc-500">Disiapkan,</p>
              <p style={{ fontSize: '9.35pt' }} className="font-semibold text-black whitespace-nowrap">
                (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
              </p>
              <p style={{ fontSize: '8.5pt' }} className="text-zinc-500 mt-1 whitespace-nowrap">{sjGudang}</p>
            </div>
            <div className="w-[30%] whitespace-nowrap">
              <p style={{ fontSize: '8.5pt', marginBottom: '3.5rem' }} className="text-zinc-500">Diantar,</p>
              <p style={{ fontSize: '9.35pt' }} className="font-semibold text-black whitespace-nowrap">
                (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
              </p>
              <p style={{ fontSize: '8.5pt' }} className="text-zinc-500 mt-1 whitespace-nowrap">{sjPengemudi}</p>
            </div>
            <div className="w-[30%] whitespace-nowrap">
              <p style={{ fontSize: '8.5pt', marginBottom: '3.5rem' }} className="text-zinc-500">Diterima (TTD & Cap),</p>
              <p style={{ fontSize: '9.35pt' }} className="font-semibold text-black whitespace-nowrap">
                (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
              </p>
              <p style={{ fontSize: '8.5pt' }} className="text-zinc-500 mt-1 whitespace-nowrap">{sjPenerima}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function PrintSjTt() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold">LOADING...</p>
        </div>
      </div>
    }>
      <PrintSjContent />
    </Suspense>
  );
}
