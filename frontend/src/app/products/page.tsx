"use client";

import { useEffect, useState } from "react";
import { useAppStore, Product } from "@/lib/store";
import { api } from "@/lib/api";
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

export default function ProductsPage() {
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

  // Wait, let's fix the typo finaly -> finally
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
    if (!confirm("Are you sure you want to delete this product?")) return;
    setError(null);
    setSuccess(null);
    try {
      if (role === "admin") {
        throw new Error("Access Denied: Only Master role accounts can delete products.");
      }
      setIsLoading(true);
      await api.products.delete(code);
      setSuccess("Product deleted successfully.");
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
        setSuccess(`Product ${formData.nama_product} updated successfully.`);
      } else {
        // Add Product
        await api.products.create(formData);
        setSuccess(`Product ${formData.nama_product} created successfully.`);
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
      header: "Product Code",
      sortKey: "kode_product" as keyof Product,
      accessor: (item: Product) => (
        <span className="px-2.5 py-1.5 font-mono font-semibold rounded-lg bg-slate-50 dark:bg-slate-900 border border-card-border text-slate-800 dark:text-slate-200">
          {item.kode_product}
        </span>
      ),
    },
    {
      header: "Name",
      sortKey: "nama_product" as keyof Product,
      accessor: (item: Product) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{item.nama_product}</span>
      ),
    },
    {
      header: "Packaging (KG)",
      sortKey: "kemasan_kg" as keyof Product,
      accessor: (item: Product) => (
        <span className="font-medium text-slate-700 dark:text-slate-350">{item.kemasan_kg} kg</span>
      ),
    },
    {
      header: "Trading Unit",
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Products Catalogue
          </h1>
          <p className="text-xs text-slate-550 mt-0.5">
            Maintain items, weights, standard packaging units, and safety stock flags.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
        >
          <PackagePlus className="w-4 h-4" />
          <span>Add Product SKU</span>
        </button>
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

      {/* Main Datatable */}
      <Table
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Search product by name or product code..."
        searchFilter={(item, query) =>
          item.nama_product.toLowerCase().includes(query.toLowerCase()) ||
          item.kode_product.toLowerCase().includes(query.toLowerCase())
        }
        actions={(item) => (
          <>
            <button
              onClick={() => openEditModal(item)}
              className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Edit Product"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(item.kode_product)}
              disabled={role === "admin"}
              className={`p-1.5 rounded-lg border border-border-custom hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-accent-red transition-colors cursor-pointer
                ${role === "admin" ? "opacity-30 cursor-not-allowed" : ""}`}
              title={role === "admin" ? "Master Only feature" : "Delete Product"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      />

      {/* Modal form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedProd ? "Edit SKU details" : "Register Product SKU"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Product SKU Code
              </label>
              <input
                type="text"
                required
                disabled={!!selectedProd}
                placeholder="e.g. ALS"
                {...register("kode_product")}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Product Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alumunium Sulfat Crystal Bongkah"
                {...register("nama_product")}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Kemasan (KG)
              </label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 50"
                {...register("kemasan_kg")}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Standard Unit
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SAK"
                {...register("unit")}
                className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

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
              disabled={actionLoading}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{selectedProd ? "Update Product" : "Create Product"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
