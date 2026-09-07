"use client";

import { useEffect, useState } from "react";
import { useAppStore, Product } from "@/lib/store";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { Table } from "@/components/Table";
import { Modal } from "@/components/Modal";
import { useForm } from "react-hook-form";
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  PackagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProductsPage() {
  const { t } = useTranslation();
  const { products, role, isMockMode, setProducts } = useAppStore();
  const [data, setData] = useState<Product[]>(products);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form setup
  const { register, handleSubmit, reset, setValue } = useForm<Product>();

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let list: Product[] = [];
      if (isMockMode) {
        list = useAppStore.getState().products;
      } else {
        list = await api.products.list();
      }
      const sorted = [...list].sort((a, b) => a.nama_product.localeCompare(b.nama_product));
      setData(sorted);
      if (!isMockMode) {
        setProducts(list);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMockMode]);

  const openAddModal = () => {
    setSelectedProd(null);
    reset({
      kode_product: "",
      nama_product: "",
      kemasan_kg: 25,
      unit: "SAK",
    });
    setModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setSelectedProd(prod);
    reset(prod);
    setModalOpen(true);
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`${t.products.confirmDelete} (${code})?`)) return;
    setError(null);
    setSuccess(null);
    try {
      if (role === "admin") {
        throw new Error("Access Denied: Only Master role accounts can delete products.");
      }
      setIsLoading(true);
      await api.products.delete(code);
      setSuccess(t.products.deletedSuccess);
      loadData();
    } catch (err: any) {
      setError(err.message || "Delete failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (formData: Product) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      formData.kemasan_kg = Number(formData.kemasan_kg);

      if (selectedProd) {
        // Edit Product
        await api.products.update(selectedProd.kode_product, formData);
        setSuccess(t.products.updatedSuccess);
      } else {
        // Add Product
        await api.products.create(formData);
        setSuccess(t.products.createdSuccess);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to submit product form.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: t.products.productCode,
      sortKey: "kode_product" as keyof Product,
      accessor: (item: Product) => (
        <span className="px-2.5 py-1.5 font-mono font-semibold rounded-lg bg-slate-50 dark:bg-slate-900 border border-card-border text-slate-800 dark:text-slate-200">
          {item.kode_product}
        </span>
      ),
    },
    {
      header: t.products.productName,
      sortKey: "nama_product" as keyof Product,
      accessor: (item: Product) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{item.nama_product}</span>
      ),
    },
    {
      header: t.products.packagingKg,
      sortKey: "kemasan_kg" as keyof Product,
      accessor: (item: Product) => (
        <span className="font-medium text-slate-700 dark:text-slate-350">{item.kemasan_kg} kg</span>
      ),
    },
    {
      header: t.products.unit,
      sortKey: "unit" as keyof Product,
      accessor: (item: Product) => (
        <span className="text-slate-500 font-medium">{item.unit}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t.products.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.products.subtitle}
          </p>
        </div>

        <Button onClick={openAddModal} className="gap-2">
          <PackagePlus className="w-4 h-4" />
          <span>{t.products.addNew}</span>
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="py-2.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <AlertDescription className="text-xs">{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Datatable */}
      <Table
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder={t.products.searchPlaceholder}
        searchFilter={(item, query) =>
          item.nama_product.toLowerCase().includes(query.toLowerCase()) ||
          item.kode_product.toLowerCase().includes(query.toLowerCase())
        }
        actions={(item) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => openEditModal(item)}
              title={t.products.editProduct}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => handleDelete(item.kode_product)}
              disabled={role === "admin"}
              className={
                role === "admin"
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:text-destructive hover:bg-destructive/10"
              }
              title={t.common.delete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      />

      {/* Modal form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedProd ? t.products.editProduct : t.products.addNew}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.products.productCode}
              </Label>
              <Input
                type="text"
                required
                disabled={!!selectedProd}
                placeholder="e.g. ALS"
                {...register("kode_product")}
                className="disabled:opacity-50 disabled:bg-muted"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.products.productName}
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. Alumunium Sulfat Crystal Bongkah"
                {...register("nama_product")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.products.packagingKg}
              </Label>
              <Input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 50"
                {...register("kemasan_kg")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t.products.unit}
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. SAK"
                {...register("unit")}
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="gap-1.5"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{selectedProd ? t.products.editProduct : t.products.addNew}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
