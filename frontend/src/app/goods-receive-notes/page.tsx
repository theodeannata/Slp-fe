"use client";

import { useEffect, useState } from "react";
import { useAppStore, GoodsReceiveNote, Purchase } from "@/lib/store";
import { api } from "@/lib/api";
import { Table } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { useTranslation } from "@/lib/i18n";
import { useForm } from "react-hook-form";
import {
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Edit2,
  Trash2,
  Calendar,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GRNFormInput {
  po_type: "pt" | "non-pt";
  parent_id: string; // pembelian_id or beli_non_pt_id
  tgl_terima: string;
  qty_terima_kg: number;
  note: string;
}

export default function GoodsReceiveNotesPage() {
  const { t } = useTranslation();
  const {
    goodsReceiveNotes,
    setGoodsReceiveNotes,
    purchasesPT,
    purchasesNonPT,
    setPurchasesPT,
    setPurchasesNonPT,
    role,
    isMockMode,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("2024");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceiveNote | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetching POs for dropdown selection
  const [poListPT, setPoListPT] = useState<Purchase[]>([]);
  const [poListNonPT, setPoListNonPT] = useState<Purchase[]>([]);

  // Form setup
  const { register, handleSubmit, reset, watch } = useForm<GRNFormInput>({
    defaultValues: {
      po_type: "pt",
      parent_id: "",
      tgl_terima: new Date().toISOString().split("T")[0],
      qty_terima_kg: 0,
      note: "",
    }
  });

  const watchedPoType = watch("po_type");

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        // Mock store handles caching
      } else {
        const grns = await api.goodsReceiveNotes.list();
        setGoodsReceiveNotes(grns);

        const pts = await api.purchases.listPT(selectedYear);
        setPurchasesPT(pts);
        setPoListPT(pts);

        const nonPts = await api.purchases.listNonPT(selectedYear);
        setPurchasesNonPT(nonPts);
        setPoListNonPT(nonPts);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load Goods Receive Notes.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load data once on mount or when mode/year switches
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMockMode, selectedYear]);

  // Sync mock data to dropdown states only in mock mode
  useEffect(() => {
    if (isMockMode) {
      let pts = purchasesPT;
      let nonPts = purchasesNonPT;
      if (selectedYear) {
        pts = purchasesPT.filter((p) => p.tgl_po && p.tgl_po.substring(0, 4) === selectedYear);
        nonPts = purchasesNonPT.filter((p) => p.tgl_po && p.tgl_po.substring(0, 4) === selectedYear);
      }
      setPoListPT(pts);
      setPoListNonPT(nonPts);
    }
  }, [isMockMode, purchasesPT, purchasesNonPT, selectedYear]);

  const openAddModal = () => {
    setSelectedGrn(null);
    reset({
      po_type: "pt",
      parent_id: "",
      tgl_terima: new Date().toISOString().split("T")[0],
      qty_terima_kg: 0,
      note: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (grn: GoodsReceiveNote) => {
    setSelectedGrn(grn);
    const poType = grn.pembelian_id ? "pt" : "non-pt";
    const parentId = grn.pembelian_id || grn.beli_non_pt_id || "";
    reset({
      po_type: poType,
      parent_id: parentId,
      tgl_terima: grn.tgl_terima,
      qty_terima_kg: grn.qty_terima_kg,
      note: grn.note || "",
    });
    setModalOpen(true);
  };

  const handleDeleteGrn = async (grn: GoodsReceiveNote) => {
    if (!confirm(`Are you sure you want to delete this receipt record of ${grn.qty_terima_kg} kg?`)) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      if (role === "admin") {
        throw new Error("Access Denied: Only Master / DB Admin accounts can delete Goods Receive Notes.");
      }
      if (isMockMode) {
        useAppStore.getState().deleteGoodsReceiveNote(grn.id);
      } else {
        await api.goodsReceiveNotes.delete(grn.id);
      }
      setSuccess("Goods Receive Note deleted successfully.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (formData: GRNFormInput) => {
    if (!formData.parent_id) {
      setError("Please select a valid Purchase Order.");
      return;
    }
    if (Number(formData.qty_terima_kg) <= 0) {
      setError("Quantity received must be greater than 0.");
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        pembelian_id: formData.po_type === "pt" ? formData.parent_id : null,
        beli_non_pt_id: formData.po_type === "non-pt" ? formData.parent_id : null,
        tgl_terima: formData.tgl_terima,
        qty_terima_kg: Number(formData.qty_terima_kg),
        note: formData.note || null,
      };

      if (selectedGrn) {
        // Edit mode
        if (isMockMode) {
          useAppStore.getState().updateGoodsReceiveNote(selectedGrn.id, payload);
        } else {
          await api.goodsReceiveNotes.update(selectedGrn.id, payload);
        }
        setSuccess("Goods Receive Note updated successfully.");
      } else {
        // Create mode
        if (isMockMode) {
          useAppStore.getState().addGoodsReceiveNote({
            ...payload,
            id: `grn-new-${Date.now()}`,
            kode_barang: null,
            barang: null,
          } as any);
        } else {
          await api.goodsReceiveNotes.create(payload);
        }
        setSuccess("Goods Receive Note registered successfully.");
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save Goods Receive Note.");
    } finally {
      setActionLoading(false);
    }
  };

  const availablePOs = watchedPoType === "pt" ? poListPT : poListNonPT;
  const sortedPOs = [...availablePOs].sort((a, b) => {
    const dateA = a.tgl_po || "";
    const dateB = b.tgl_po || "";
    return dateB.localeCompare(dateA);
  });

  const columns = [
    {
      header: t.goodsReceiveNotes.receiveDate,
      sortKey: "tgl_terima" as keyof GoodsReceiveNote,
      accessor: (item: GoodsReceiveNote) => (
        <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{item.tgl_terima}</span>
        </div>
      ),
    },
    {
      header: t.goodsReceiveNotes.linkedPO,
      sortKey: "pembelian_id" as keyof GoodsReceiveNote,
      accessor: (item: GoodsReceiveNote) => {
        const ref = item.pembelian_id || item.beli_non_pt_id || "-";
        const typeLabel = item.pembelian_id ? "PT" : "Non-PT";
        return (
          <div className="space-y-0.5">
            <span className="font-bold font-mono text-sm text-zinc-800 dark:text-zinc-100">{ref}</span>
            <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Type: {typeLabel}
            </span>
          </div>
        );
      },
    },
    {
      header: `${t.products.productCode} & ${t.products.productName}`,
      sortKey: "barang" as keyof GoodsReceiveNote,
      accessor: (item: GoodsReceiveNote) => (
        <div className="space-y-0.5">
          <span className="font-semibold block text-slate-700 dark:text-slate-200">{item.barang || "Loading name..."}</span>
          <span className="text-[10px] font-mono text-slate-400">{item.kode_barang || "SKU..."}</span>
        </div>
      ),
    },
    {
      header: t.goodsReceiveNotes.qtyReceivedKg,
      sortKey: "qty_terima_kg" as keyof GoodsReceiveNote,
      accessor: (item: GoodsReceiveNote) => (
        <span className="font-extrabold text-sm text-foreground">
          {item.qty_terima_kg.toLocaleString("id-ID")} kg
        </span>
      ),
    },
    {
      header: t.goodsReceiveNotes.notes,
      sortKey: "note" as keyof GoodsReceiveNote,
      accessor: (item: GoodsReceiveNote) => (
        <p className="text-xs text-slate-555 dark:text-slate-400 italic max-w-xs truncate">
          {item.note || "-"}
        </p>
      ),
    },
  ];

  const filteredGrns = [...goodsReceiveNotes]
    .filter((grn) => !selectedYear || (grn.tgl_terima && grn.tgl_terima.substring(0, 4) === selectedYear))
    .sort((a, b) => {
      const dateA = a.tgl_terima || "";
      const dateB = b.tgl_terima || "";
      return dateB.localeCompare(dateA);
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            <span>{t.goodsReceiveNotes.title}</span>
          </h1>
          <p className="text-xs text-slate-555 mt-0.5">
            {t.goodsReceiveNotes.subtitle}
          </p>
        </div>

        <Button
          onClick={openAddModal}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{t.goodsReceiveNotes.addNew}</span>
        </Button>
      </div>

      {/* Filter by Year */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground font-medium">{t.common.filter} Year:</span>
        <div className="flex items-center gap-1.5">
          {["2022", "2023", "2024", "2025", "2026"].map((yr) => (
            <Button
              key={yr}
              size="sm"
              variant={selectedYear === yr ? "default" : "outline"}
              onClick={() => setSelectedYear(yr)}
              className="h-7 px-3 text-xs"
            >
              {yr}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
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

      {/* Main Datatable */}
      <Table
        columns={columns}
        data={filteredGrns}
        isLoading={isLoading}
        searchPlaceholder={t.goodsReceiveNotes.searchPlaceholder}
        searchFilter={(item: GoodsReceiveNote, query) =>
          (item.pembelian_id ? item.pembelian_id.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.beli_non_pt_id ? item.beli_non_pt_id.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.barang ? item.barang.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.kode_barang ? item.kode_barang.toLowerCase().includes(query.toLowerCase()) : false) ||
          (item.note ? item.note.toLowerCase().includes(query.toLowerCase()) : false)
        }
        actions={(item: GoodsReceiveNote) => (
          <>
            <button
              onClick={() => openEditModal(item)}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Edit Goods Receipt Record"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteGrn(item)}
              disabled={role === "admin"}
              className={`p-1.5 rounded-lg border border-border-custom hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-accent-red transition-colors cursor-pointer
                ${role === "admin" ? "opacity-30 cursor-not-allowed" : ""}`}
              title={role === "admin" ? "Master / DB Admin Only feature" : "Delete Goods Receipt Record"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      />

      {/* Add / Edit GRN Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedGrn ? "Edit Goods Receive Note" : "Register New Goods Receipt"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-sans">
          {/* PO Type selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">PO Category</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-350 cursor-pointer">
                <input
                  type="radio"
                  value="pt"
                  disabled={!!selectedGrn}
                  {...register("po_type")}
                  className="accent-primary"
                />
                <span>PT Purchases PO</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-350 cursor-pointer">
                <input
                  type="radio"
                  value="non-pt"
                  disabled={!!selectedGrn}
                  {...register("po_type")}
                  className="accent-primary"
                />
                <span>Non-PT Purchases PO</span>
              </label>
            </div>
          </div>

          {/* Reference PO Item selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Referenced PO Line Item</label>
            {selectedGrn ? (
              <input
                type="text"
                disabled
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-slate-100 dark:bg-zinc-800/80 cursor-not-allowed text-slate-700 dark:text-slate-350 text-xs font-mono font-semibold"
                value={`${selectedGrn.pembelian_id || selectedGrn.beli_non_pt_id} - ${selectedGrn.kode_barang} (${selectedGrn.barang})`}
              />
            ) : (
              <select
                required
                {...register("parent_id", { required: true })}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">-- Select PO Line Item --</option>
                {sortedPOs.map((po) => (
                  <option key={po.kode_unik} value={po.kode_unik}>
                    {po.no_po} (Urut {po.no_urut}) — {po.kode_barang} ({po.barang})
                  </option>
                ))}
              </select>
            )}
            {!selectedGrn && sortedPOs.length === 0 && (
              <p className="text-[10px] text-accent-red font-medium leading-tight flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>No purchase records found in database to log receipts against.</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Received Date */}
            <div className="space-y-1.5">
              <Label htmlFor="tgl_terima">Date Received</Label>
              <Input
                id="tgl_terima"
                type="date"
                required
                {...register("tgl_terima", { required: true })}
              />
            </div>

            {/* Received Qty */}
            <div className="space-y-1.5">
              <Label htmlFor="qty_terima_kg">Qty Received (kg)</Label>
              <Input
                id="qty_terima_kg"
                type="number"
                step="0.01"
                required
                placeholder="e.g. 500"
                {...register("qty_terima_kg", { required: true, valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Memo Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="note">Delivery Notes (Memo)</Label>
            <textarea
              id="note"
              {...register("note")}
              rows={2}
              placeholder="e.g. Received partial delivery of 20 bags, good condition..."
              className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border-custom">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading || (!selectedGrn && sortedPOs.length === 0)}
              className="flex items-center gap-1.5"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{selectedGrn ? "Update Receipt" : "Create Receipt"}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
