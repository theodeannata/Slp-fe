"use client";

import { useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [tradingFile, setTradingFile] = useState<File | null>(null);
  const [komisiFile, setKomisiFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradingFile || !komisiFile) {
      setError("Please select both files.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("trading_file", tradingFile);
    formData.append("komisi_file", komisiFile);

    try {
      // Call local proxy route to avoid CORS — the server forwards to Railway
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process files. Please check the backend.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = "results.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-purple-50 flex flex-col items-center justify-center p-6 sm:p-12 font-[family-name:var(--font-geist-sans)] relative">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-xl w-full bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:shadow-[0_8px_40px_rgb(0,0,0,0.08)] p-8 sm:p-10 relative overflow-hidden z-10"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
            className="w-16 h-16 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-white"
          >
            <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
          </motion.div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
            Ledger & Commission Processor
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-[280px] mx-auto leading-relaxed">
            Upload your trading and commission data to automatically reconcile and match ledgers.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            <FileInput 
              label="Trading Data" 
              file={tradingFile} 
              setFile={setTradingFile} 
              id="trading" 
            />
            <FileInput 
              label="Commission Data" 
              file={komisiFile} 
              setFile={setKomisiFile} 
              id="komisi" 
            />
          </div>

          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-3 border border-red-100 origin-top"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3 border border-emerald-100 origin-top"
              >
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Processing complete! Your files have been downloaded.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}>
            <button
              type="submit"
              disabled={loading || !tradingFile || !komisiFile}
              className={`w-full relative overflow-hidden group font-medium py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2
                ${
                  loading || (!tradingFile || !komisiFile)
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60"
                    : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg shadow-md border border-slate-700"
                }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating ledgers...
                </>
              ) : (
                <>
                  <span className="relative z-10">Start Processing</span>
                  <UploadCloud className={`w-5 h-5 relative z-10 transition-transform duration-300 ${(!tradingFile || !komisiFile) ? '' : 'group-hover:-translate-y-0.5'}`} />
                </>
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-slate-400 text-xs mt-8 z-10"
      >
        Designed for speed, style, and accuracy.
      </motion.p>
    </main>
  );
}

function FileInput({ 
  label, 
  file, 
  setFile, 
  id 
}: { 
  label: string; 
  file: File | null; 
  setFile: (f: File | null) => void;
  id: string;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
        {label}
      </label>
      <div 
        className={`relative group border-2 border-dashed rounded-xl transition-all duration-300 ease-out
          ${file ? 'border-indigo-300 bg-indigo-50/50 shadow-sm' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/80 hover:shadow-sm'}`}
      >
        <input
          id={id}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          required
        />
        <div className="px-6 py-5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className={`p-2.5 rounded-lg ${file ? 'bg-white shadow-sm text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-indigo-500 group-hover:shadow-sm'} transition-all duration-300`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="truncate">
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div 
                    key="file"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex flex-col"
                  >
                    <span className="text-sm font-medium text-slate-800 truncate">{file.name}</span>
                    <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                  </motion.div>
                ) : (
                  <motion.span 
                    key="empty"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm text-slate-500 group-hover:text-slate-600 transition-colors block"
                  >
                    Select Excel file (.xlsx, .xls)
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0 ml-3" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
