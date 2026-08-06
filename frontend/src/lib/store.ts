import { create } from "zustand";

// Core Types matching API_INTEGRATION.md
export interface Customer {
  customer_id: string;
  customer: string;
  npwp_ktp: string;
  address: string;
  city: string;
  is_active?: boolean;
}

export interface Product {
  kode_product: string;
  nama_product: string;
  kemasan_kg: number;
  unit: string;
  warehouse_stock?: number;
  calculated_stock?: number;
}

export interface Sale {
  kode_unik: string;
  sumber?: string;
  tgl: string;
  no_sj_inv: string;
  id: string; // Customer ID
  customer: string; // Customer Name
  no_urut: number;
  kode_barang: string;
  barang: string;
  satuan_kemasan: number;
  qty_kg: number;
  harga_exc: number | null;
  harga_inc: number | null;
  total_include: number;
  nilai_lain: number | null;
  ppn: number | null;
  tempo: number;
  jatuh_tempo: string;
  tgl_bayar_1: string | null;
  nilai_bayar_1: number | null;
  sisa: number;
  terbayar: number;
  status_tempo: string; // e.g. "Lunas" | "Belum Lunas"
  bagi_hasil: string | null;
  npwp: string | null;
  catatan: string | null;
  catatan2: string | null;
  fp: string; // "T" or "F" or null
}

export interface GoodsReceiveNote {
  id: string;
  pembelian_id: string | null;
  beli_non_pt_id: string | null;
  kode_barang: string | null;
  barang: string | null;
  tgl_terima: string;
  qty_terima_kg: number;
  note: string | null;
  created_at?: string;
}

export interface Purchase {
  kode_unik: string;
  tgl_terima_barang: string;
  tgl_bayar: string;
  tgl_po: string;
  no_po: string;
  vendor_id?: string;
  vendor: string;
  no_urut: number;
  kode_barang: string;
  barang: string;
  qty_kg: number;
  qty_terima_kg: number;
  dpp: number;
  harga: number;
  total: number;
  note: string | null;
  jual: number | null;
  total_jual: number | null;
  untung: number | null;
  persen: number | null;
  coa_halal?: string; // Optional field for non-pt
  goods_receive_notes?: GoodsReceiveNote[];
}

export interface Payment {
  id?: string;
  tgl_bayar: string;
  nilai_transfer: number;
  no_invoice: string;
  customer: string;
  nilai_bayar_invoice: number;
  note: string | null;
}

export interface BankStatement {
  id: string;
  period_month: string;
  tanggal_terima?: string | null;
  tanggal: string;
  keterangan: string;
  masuk?: number | null;
  keluar?: number | null;
  account?: string | null; // "AR" | "AP" | "Biaya" | "Biaya PS" | "CB" | "Komisi"
  saldo?: number | null;
  no_invoice?: string | null;
  created_at?: string;
}

export interface Vendor {
  vendor_id: string;
  vendor: string;
  npwp_ktp: string;
  address: string;
  city: string;
}

interface User {
  email: string;
  id: string;
}

interface AppState {
  // Theme & UI state
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Mock Mode Toggle
  isMockMode: boolean;
  setMockMode: (mock: boolean) => void;

  // Auth State
  user: User | null;
  role: "admin" | "master" | "db_admin" | "pending";
  session: any;
  setAuth: (user: User | null, role: "admin" | "master" | "db_admin" | "pending", session?: any) => void;
  logout: () => void;

  // Migration status
  migrationStatus: "idle" | "running" | "success" | "error";
  migrationMessage: string;
  triggerMigration: () => Promise<void>;

  // Data Lists (Mock Mode data caches)
  customers: Customer[];
  vendors: Vendor[];
  products: Product[];
  sales: Sale[];
  purchasesPT: Purchase[];
  purchasesNonPT: Purchase[];
  payments: Payment[];
  goodsReceiveNotes: GoodsReceiveNote[];

  // CRUD actions for Customer
  addCustomer: (cust: Customer) => void;
  updateCustomer: (id: string, cust: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // CRUD actions for Vendor
  addVendor: (vendor: Vendor) => void;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;

  // CRUD actions for Product
  addProduct: (prod: Product) => void;
  updateProduct: (code: string, prod: Partial<Product>) => void;
  deleteProduct: (code: string) => void;

  // CRUD actions for Sale
  addSale: (sale: Sale) => void;
  updateSale: (code: string, sale: Partial<Sale>) => void;
  deleteSale: (code: string) => void;

  // CRUD actions for Purchases
  addPurchasePT: (p: Purchase) => void;
  updatePurchasePT: (code: string, p: Partial<Purchase>) => void;
  deletePurchasePT: (code: string) => void;
  addPurchaseNonPT: (p: Purchase) => void;
  updatePurchaseNonPT: (code: string, p: Partial<Purchase>) => void;
  deletePurchaseNonPT: (code: string) => void;

  // CRUD actions for Payments
  addPayment: (p: Payment) => void;

  // CRUD actions for Goods Receive Notes
  addGoodsReceiveNote: (grn: GoodsReceiveNote) => void;
  updateGoodsReceiveNote: (id: string, grn: Partial<GoodsReceiveNote>) => void;
  deleteGoodsReceiveNote: (id: string) => void;

  // Global State Setters for synchronization
  setCustomers: (customers: Customer[]) => void;
  setVendors: (vendors: Vendor[]) => void;
  setProducts: (products: Product[]) => void;
  setSales: (sales: Sale[]) => void;
  setPurchasesPT: (purchases: Purchase[]) => void;
  setPurchasesNonPT: (purchases: Purchase[]) => void;
  setPayments: (payments: Payment[]) => void;
  setGoodsReceiveNotes: (grns: GoodsReceiveNote[]) => void;
}

// Seed mock data helper
const initialCustomers: Customer[] = [
  {
    customer_id: "A001",
    customer: "Agus Catur",
    npwp_ktp: "12.345.678.9-012.000",
    address: "Jakarta Barat, DKI Jakarta",
    city: "Jakarta",
  },
  {
    customer_id: "B001",
    customer: "Budi Santoso",
    npwp_ktp: "98.765.432.1-098.000",
    address: "Surabaya Industrial Estate",
    city: "Surabaya",
  },
  {
    customer_id: "C001",
    customer: "CV. Maju Jaya Bersama",
    npwp_ktp: "11.222.333.4-555.000",
    address: "Kawasan Industri Cikarang",
    city: "Bekasi",
  },
];

const initialVendors: Vendor[] = [
  {
    vendor_id: "V001",
    vendor: "Barentz Indonesia",
    npwp_ktp: "12.345.678.9-012.000",
    address: "Sudirman Cav 21",
    city: "Jakarta",
  },
  {
    vendor_id: "V002",
    vendor: "Toko Kimia Sentosa",
    npwp_ktp: "98.765.432.1-098.000",
    address: "Kawasan Industri Jababeka",
    city: "Bekasi",
  },
];

const initialProducts: Product[] = [
  {
    kode_product: "ALS",
    nama_product: "Alumunium Sulfat Crystal Bongkah",
    kemasan_kg: 50.0,
    unit: "SAK",
  },
  {
    kode_product: "PRX",
    nama_product: "Sodium Benzoat Purox",
    kemasan_kg: 25.0,
    unit: "SAK",
  },
  {
    kode_product: "WHN",
    nama_product: "Sodium Benzoat Wuhan",
    kemasan_kg: 25.0,
    unit: "SAK",
  },
];

const initialSales: Sale[] = [
  {
    kode_unik: "SLP/INV/0722/0002-1",
    sumber: "2022",
    tgl: "2022-07-12",
    no_sj_inv: "SLP/INV/0722/0002",
    id: "A001",
    customer: "Agus Catur",
    no_urut: 1,
    kode_barang: "ALS",
    barang: "Alumunium Sulfat Crystal Bongkah",
    satuan_kemasan: 50.0,
    qty_kg: 5000.0,
    harga_exc: 14864.86,
    harga_inc: 16500.0,
    total_include: 82500000.0,
    nilai_lain: null,
    ppn: 8250000,
    tempo: 14,
    jatuh_tempo: "2022-07-26",
    tgl_bayar_1: "2022-08-01",
    nilai_bayar_1: 82500000.0,
    sisa: 0.0,
    terbayar: 82500000.0,
    status_tempo: "Lunas",
    bagi_hasil: "Agustus",
    npwp: "12.345.678.9-012.000",
    catatan: "Kirim ke Gudang Cikarang",
    catatan2: null,
    fp: "T",
  },
  {
    kode_unik: "SLP/INV/0122/0002-1",
    sumber: "non_pt",
    tgl: "2022-01-26",
    no_sj_inv: "SLP/INV/0122/0002",
    id: "B001",
    customer: "Budi Santoso",
    no_urut: 1,
    kode_barang: "PRX",
    barang: "Sodium Benzoat Purox",
    satuan_kemasan: 25.0,
    qty_kg: 200.0,
    harga_exc: null,
    harga_inc: 64000.0,
    total_include: 12800000.0,
    nilai_lain: null,
    ppn: null,
    tempo: 30,
    jatuh_tempo: "2022-02-25",
    tgl_bayar_1: "2022-02-25",
    nilai_bayar_1: 12800000.0,
    sisa: 0.0,
    terbayar: 12800000.0,
    status_tempo: "Lunas",
    bagi_hasil: "Februari",
    npwp: null,
    catatan: "Ada di rekening non-PT",
    catatan2: null,
    fp: "F",
  },
  {
    kode_unik: "SLP/INV/0123/0212-1",
    sumber: "2023",
    tgl: "2023-01-03",
    no_sj_inv: "SLP/INV/0123/0212",
    id: "C001",
    customer: "CV. Maju Jaya Bersama",
    no_urut: 1,
    kode_barang: "PRX",
    barang: "Sodium Benzoat Purox",
    satuan_kemasan: 25.0,
    qty_kg: 150.0,
    harga_exc: 18468.47,
    harga_inc: 20500.0,
    total_include: 3075000.0,
    nilai_lain: null,
    ppn: 337837,
    tempo: 30,
    jatuh_tempo: "2023-02-02",
    tgl_bayar_1: "2023-02-09",
    nilai_bayar_1: 3075000.0,
    sisa: 0.0,
    terbayar: 3075000.0,
    status_tempo: "Lunas",
    bagi_hasil: "Februari",
    npwp: "11.222.333.4-555.000",
    catatan: "Faktur Pajak Standard",
    catatan2: null,
    fp: "T",
  },
  {
    kode_unik: "SLP/INV/0124/0001-1",
    sumber: "2024",
    tgl: "2024-01-02",
    no_sj_inv: "SLP/INV/0124/0001",
    id: "B001",
    customer: "Budi Santoso",
    no_urut: 1,
    kode_barang: "PRX",
    barang: "Sodium Benzoat Purox",
    satuan_kemasan: 25.0,
    qty_kg: 50.0,
    harga_exc: 39639.64,
    harga_inc: 44000.0,
    total_include: 2200000.0,
    nilai_lain: null,
    ppn: 236036,
    tempo: 30,
    jatuh_tempo: "2024-02-01",
    tgl_bayar_1: "2024-02-13",
    nilai_bayar_1: 2200000.0,
    sisa: 0.0,
    terbayar: 2200000.0,
    status_tempo: "Lunas",
    bagi_hasil: "Februari",
    npwp: "98.765.432.1-098.000",
    catatan: "Pengiriman via ekspedisi internal",
    catatan2: "Faktur Pajak Standard",
    fp: "T",
  },
  {
    kode_unik: "SLP/INV/0426/0045-1",
    sumber: "2026",
    tgl: "2026-04-10",
    no_sj_inv: "SLP/INV/0426/0045",
    id: "A001",
    customer: "Agus Catur",
    no_urut: 1,
    kode_barang: "ALS",
    barang: "Alumunium Sulfat Crystal Bongkah",
    satuan_kemasan: 50.0,
    qty_kg: 2000.0,
    harga_exc: 5000.0,
    harga_inc: 5550.0,
    total_include: 11100000.0,
    nilai_lain: null,
    ppn: 1100000,
    tempo: 14,
    jatuh_tempo: "2026-04-24",
    tgl_bayar_1: null,
    nilai_bayar_1: null,
    sisa: 11100000.0,
    terbayar: 0.0,
    status_tempo: "Belum Lunas",
    bagi_hasil: null,
    npwp: "12.345.678.9-012.000",
    catatan: "Gudang Barat",
    catatan2: null,
    fp: "T",
  },
];

const initialPurchasesPT: Purchase[] = [
  {
    kode_unik: "SLP/PO/0622/0001-1",
    tgl_terima_barang: "2022-06-29",
    tgl_bayar: "2022-06-29",
    tgl_po: "2022-06-28",
    no_po: "SLP/PO/0622/0001",
    vendor_id: "V001",
    vendor: "Barentz Indonesia",
    no_urut: 1,
    kode_barang: "WHN",
    barang: "Sodium Benzoat Wuhan",
    qty_kg: 300.0,
    qty_terima_kg: 300.0,
    dpp: 30500.0,
    harga: 33855.0,
    total: 10156500.0,
    note: "PO Urgent",
    jual: 35000.0,
    total_jual: 10500000.0,
    untung: 343500.0,
    persen: 3.38,
  },
];

const initialPurchasesNonPT: Purchase[] = [
  {
    kode_unik: "SLP/PO/0122/0001-1",
    tgl_terima_barang: "2022-01-15",
    tgl_bayar: "2022-01-20",
    tgl_po: "2022-01-10",
    no_po: "SLP/PO/0122/0001",
    vendor_id: "V002",
    vendor: "Toko Kimia Sentosa",
    no_urut: 1,
    kode_barang: "ALS",
    barang: "Alumunium Sulfat Crystal Bongkah",
    qty_kg: 1000.0,
    qty_terima_kg: 1000.0,
    dpp: 4000.0,
    harga: 4440.0,
    total: 4440000.0,
    note: "Pengecekan COA Halal",
    jual: 5000.0,
    total_jual: 5000000.0,
    untung: 560000.0,
    persen: 12.6,
    coa_halal: "Y",
  },
];

const initialPayments: Payment[] = [
  {
    id: "pay-001",
    tgl_bayar: "2024-02-13",
    nilai_transfer: 2200000.0,
    no_invoice: "SLP/INV/0124/0001",
    customer: "Budi Santoso",
    nilai_bayar_invoice: 2200000.0,
    note: "Lunas invoice SLP/INV/0124/0001",
  },
];

const getLocalStorage = (key: string, fallback: any) => {
  if (typeof window === "undefined") return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const setLocalStorage = (key: string, value: any) => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(e);
    }
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  // Theme & UI States
  theme: getLocalStorage("slp_theme", "light"),
  sidebarCollapsed: false,
  toggleTheme: () => {
    const nextTheme = get().theme === "light" ? "dark" : "light";
    set({ theme: nextTheme });
    setLocalStorage("slp_theme", nextTheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (nextTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  },
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Mock Mode (toggled true by default unless overrides are met)
  isMockMode: getLocalStorage("slp_mock_mode", false),
  setMockMode: (mock) => {
    set({ isMockMode: mock });
    setLocalStorage("slp_mock_mode", mock);
  },

  // Auth State
  user: getLocalStorage("slp_user", { email: "master@slp.id", id: "demo-user-id" }),
  role: getLocalStorage("slp_role", "pending") as "admin" | "master" | "db_admin" | "pending",
  session: null,
  setAuth: (user, role, session = null) => {
    set({ user, role, session });
    setLocalStorage("slp_user", user);
    setLocalStorage("slp_role", role);
  },
  logout: () => {
    set({ user: null, role: "pending", session: null });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("slp_user");
      window.localStorage.removeItem("slp_role");
    }
  },

  // Migration status
  migrationStatus: "idle",
  migrationMessage: "",
  triggerMigration: async () => {
    set({ migrationStatus: "running", migrationMessage: "Starting Excel ingestion tasks..." });
    if (get().isMockMode) {
      // Simulate background migration delay
      await new Promise((resolve) => setTimeout(resolve, 3000));
      set({
        migrationStatus: "success",
        migrationMessage: "Successfully imported 142 records from Ledgers.xlsx!",
      });
      // Optionally seed some additional items here
    } else {
      // Handled in api client trigger
    }
  },

  // Core lists with local storage persistence
  customers: getLocalStorage("slp_customers", initialCustomers),
  vendors: getLocalStorage("slp_vendors", initialVendors),
  products: getLocalStorage("slp_products", initialProducts),
  sales: getLocalStorage("slp_sales", initialSales),
  purchasesPT: getLocalStorage("slp_purchases_pt", initialPurchasesPT),
  purchasesNonPT: getLocalStorage("slp_purchases_nopt", initialPurchasesNonPT),
  payments: getLocalStorage("slp_payments", initialPayments),
  goodsReceiveNotes: getLocalStorage("slp_goods_receive_notes", []),

  // Customer Actions
  addCustomer: (cust) => {
    const list = [...get().customers, cust];
    set({ customers: list });
    setLocalStorage("slp_customers", list);
  },
  updateCustomer: (id, updatedFields) => {
    const list = get().customers.map((c) =>
      c.customer_id === id ? { ...c, ...updatedFields } : c
    );
    set({ customers: list });
    setLocalStorage("slp_customers", list);

    // Mock cascade update to sales
    if (updatedFields.customer_id || updatedFields.customer) {
      const salesList = get().sales.map((s) =>
        s.id === id
          ? {
              ...s,
              ...(updatedFields.customer_id && { id: updatedFields.customer_id }),
              ...(updatedFields.customer && { customer: updatedFields.customer }),
            }
          : s
      );
      set({ sales: salesList });
      setLocalStorage("slp_sales", salesList);
    }
  },
  deleteCustomer: (id) => {
    const list = get().customers.filter((c) => c.customer_id !== id);
    set({ customers: list });
    setLocalStorage("slp_customers", list);
  },

  // Vendor Actions
  addVendor: (v) => {
    const list = [...get().vendors, v];
    set({ vendors: list });
    setLocalStorage("slp_vendors", list);
  },
  updateVendor: (id, updatedFields) => {
    const list = get().vendors.map((v) =>
      v.vendor_id === id ? { ...v, ...updatedFields } : v
    );
    set({ vendors: list });
    setLocalStorage("slp_vendors", list);

    // Mock cascade update to purchases
    if (updatedFields.vendor_id || updatedFields.vendor) {
      const ptList = get().purchasesPT.map((p) =>
        p.vendor_id === id
          ? {
              ...p,
              ...(updatedFields.vendor_id && { vendor_id: updatedFields.vendor_id }),
              ...(updatedFields.vendor && { vendor: updatedFields.vendor }),
            }
          : p
      );
      const nonPtList = get().purchasesNonPT.map((p) =>
        p.vendor_id === id
          ? {
              ...p,
              ...(updatedFields.vendor_id && { vendor_id: updatedFields.vendor_id }),
              ...(updatedFields.vendor && { vendor: updatedFields.vendor }),
            }
          : p
      );
      set({ purchasesPT: ptList, purchasesNonPT: nonPtList });
      setLocalStorage("slp_purchases_pt", ptList);
      setLocalStorage("slp_purchases_nopt", nonPtList);
    }
  },
  deleteVendor: (id) => {
    const list = get().vendors.filter((v) => v.vendor_id !== id);
    set({ vendors: list });
    setLocalStorage("slp_vendors", list);
  },

  // Product Actions
  addProduct: (prod) => {
    const list = [...get().products, prod];
    set({ products: list });
    setLocalStorage("slp_products", list);
  },
  updateProduct: (code, updatedFields) => {
    const list = get().products.map((p) =>
      p.kode_product === code ? { ...p, ...updatedFields } : p
    );
    set({ products: list });
    setLocalStorage("slp_products", list);

    // Mock cascade update to purchases and sales
    if (updatedFields.kode_product || updatedFields.nama_product) {
      const ptList = get().purchasesPT.map((p) =>
        p.kode_barang === code
          ? {
              ...p,
              ...(updatedFields.kode_product && { kode_barang: updatedFields.kode_product }),
              ...(updatedFields.nama_product && { barang: updatedFields.nama_product }),
            }
          : p
      );
      const nonPtList = get().purchasesNonPT.map((p) =>
        p.kode_barang === code
          ? {
              ...p,
              ...(updatedFields.kode_product && { kode_barang: updatedFields.kode_product }),
              ...(updatedFields.nama_product && { barang: updatedFields.nama_product }),
            }
          : p
      );
      const salesList = get().sales.map((s) =>
        s.kode_barang === code
          ? {
              ...s,
              ...(updatedFields.kode_product && { kode_barang: updatedFields.kode_product }),
              ...(updatedFields.nama_product && { barang: updatedFields.nama_product }),
            }
          : s
      );
      set({ purchasesPT: ptList, purchasesNonPT: nonPtList, sales: salesList });
      setLocalStorage("slp_purchases_pt", ptList);
      setLocalStorage("slp_purchases_nopt", nonPtList);
      setLocalStorage("slp_sales", salesList);
    }
  },
  deleteProduct: (code) => {
    const list = get().products.filter((p) => p.kode_product !== code);
    set({ products: list });
    setLocalStorage("slp_products", list);
  },

  // Sales Actions
  addSale: (sale) => {
    const list = [...get().sales, sale];
    set({ sales: list });
    setLocalStorage("slp_sales", list);
  },
  updateSale: (code, updatedFields) => {
    const list = get().sales.map((s) =>
      s.kode_unik === code ? { ...s, ...updatedFields } : s
    );
    set({ sales: list });
    setLocalStorage("slp_sales", list);
  },
  deleteSale: (code) => {
    const list = get().sales.filter((s) => s.kode_unik !== code);
    set({ sales: list });
    setLocalStorage("slp_sales", list);
  },

  // Purchases actions
  addPurchasePT: (p) => {
    const list = [...get().purchasesPT, p];
    set({ purchasesPT: list });
    setLocalStorage("slp_purchases_pt", list);
  },
  updatePurchasePT: (code, updatedFields) => {
    const list = get().purchasesPT.map((p) =>
      p.kode_unik === code ? { ...p, ...updatedFields } : p
    );
    set({ purchasesPT: list });
    setLocalStorage("slp_purchases_pt", list);
  },
  deletePurchasePT: (code) => {
    const list = get().purchasesPT.filter((p) => p.kode_unik !== code);
    set({ purchasesPT: list });
    setLocalStorage("slp_purchases_pt", list);
  },
  addPurchaseNonPT: (p) => {
    const list = [...get().purchasesNonPT, p];
    set({ purchasesNonPT: list });
    setLocalStorage("slp_purchases_nopt", list);
  },
  updatePurchaseNonPT: (code, updatedFields) => {
    const list = get().purchasesNonPT.map((p) =>
      p.kode_unik === code ? { ...p, ...updatedFields } : p
    );
    set({ purchasesNonPT: list });
    setLocalStorage("slp_purchases_nopt", list);
  },
  deletePurchaseNonPT: (code) => {
    const list = get().purchasesNonPT.filter((p) => p.kode_unik !== code);
    set({ purchasesNonPT: list });
    setLocalStorage("slp_purchases_nopt", list);
  },

  // Payments actions (reconciles with Sales invoices)
  addPayment: (p) => {
    const nextId = "pay-" + Math.floor(Math.random() * 100000);
    const payment = { ...p, id: nextId };
    const paymentsList = [...get().payments, payment];

    // Reconcile inside mock sales
    const salesList = get().sales.map((s) => {
      // Match by SJ Invoice number
      if (s.no_sj_inv === payment.no_invoice) {
        const updatedTerbayar = s.terbayar + payment.nilai_bayar_invoice;
        const updatedSisa = Math.max(0, s.total_include - updatedTerbayar);
        const status = updatedSisa === 0 ? "Lunas" : "Belum Lunas";
        return {
          ...s,
          terbayar: updatedTerbayar,
          sisa: updatedSisa,
          status_tempo: status,
          tgl_bayar_1: s.tgl_bayar_1 || payment.tgl_bayar,
          nilai_bayar_1: s.nilai_bayar_1 || payment.nilai_bayar_invoice,
        };
      }
      return s;
    });

    set({ payments: paymentsList, sales: salesList });
    setLocalStorage("slp_payments", paymentsList);
    setLocalStorage("slp_sales", salesList);
  },

  // Goods Receive Notes Actions
  addGoodsReceiveNote: (grn) => {
    const list = [...get().goodsReceiveNotes, grn];
    set({ goodsReceiveNotes: list });
    setLocalStorage("slp_goods_receive_notes", list);

    // Sync trigger
    const isPT = grn.pembelian_id !== null;
    const parentId = grn.pembelian_id || grn.beli_non_pt_id;
    if (parentId) {
      const parentGrns = list.filter((g) => isPT ? g.pembelian_id === parentId : g.beli_non_pt_id === parentId);
      const totalQty = parentGrns.reduce((sum, g) => sum + g.qty_terima_kg, 0);
      const latestDate = parentGrns.reduce((max, g) => g.tgl_terima > max ? g.tgl_terima : max, grn.tgl_terima);
      if (isPT) {
        const ptList = get().purchasesPT.map((p) => p.kode_unik === parentId ? { ...p, qty_terima_kg: totalQty, tgl_terima_barang: latestDate } : p);
        set({ purchasesPT: ptList });
        setLocalStorage("slp_purchases_pt", ptList);
      } else {
        const nonPtList = get().purchasesNonPT.map((p) => p.kode_unik === parentId ? { ...p, qty_terima_kg: totalQty, tgl_terima_barang: latestDate } : p);
        set({ purchasesNonPT: nonPtList });
        setLocalStorage("slp_purchases_nopt", nonPtList);
      }
    }
  },
  updateGoodsReceiveNote: (id, updatedFields) => {
    const list = get().goodsReceiveNotes.map((g) => g.id === id ? { ...g, ...updatedFields } : g);
    set({ goodsReceiveNotes: list });
    setLocalStorage("slp_goods_receive_notes", list);

    const grn = list.find((g) => g.id === id);
    if (grn) {
      const isPT = grn.pembelian_id !== null;
      const parentId = grn.pembelian_id || grn.beli_non_pt_id;
      if (parentId) {
        const parentGrns = list.filter((g) => isPT ? g.pembelian_id === parentId : g.beli_non_pt_id === parentId);
        const totalQty = parentGrns.reduce((sum, g) => sum + g.qty_terima_kg, 0);
        const latestDate = parentGrns.reduce((max, g) => g.tgl_terima > max ? g.tgl_terima : max, grn.tgl_terima);
        if (isPT) {
          const ptList = get().purchasesPT.map((p) => p.kode_unik === parentId ? { ...p, qty_terima_kg: totalQty, tgl_terima_barang: latestDate } : p);
          set({ purchasesPT: ptList });
          setLocalStorage("slp_purchases_pt", ptList);
        } else {
          const nonPtList = get().purchasesNonPT.map((p) => p.kode_unik === parentId ? { ...p, qty_terima_kg: totalQty, tgl_terima_barang: latestDate } : p);
          set({ purchasesNonPT: nonPtList });
          setLocalStorage("slp_purchases_nopt", nonPtList);
        }
      }
    }
  },
  deleteGoodsReceiveNote: (id) => {
    const grn = get().goodsReceiveNotes.find((g) => g.id === id);
    const list = get().goodsReceiveNotes.filter((g) => g.id !== id);
    set({ goodsReceiveNotes: list });
    setLocalStorage("slp_goods_receive_notes", list);

    if (grn) {
      const isPT = grn.pembelian_id !== null;
      const parentId = grn.pembelian_id || grn.beli_non_pt_id;
      if (parentId) {
        const parentGrns = list.filter((g) => isPT ? g.pembelian_id === parentId : g.beli_non_pt_id === parentId);
        const totalQty = parentGrns.length > 0 ? parentGrns.reduce((sum, g) => sum + g.qty_terima_kg, 0) : 0;
        const latestDate = parentGrns.length > 0 ? parentGrns.reduce((max, g) => g.tgl_terima > max ? g.tgl_terima : max, "") : "";
        if (isPT) {
          const ptList = get().purchasesPT.map((p) => p.kode_unik === parentId ? { ...p, qty_terima_kg: totalQty, tgl_terima_barang: latestDate || "" } : p);
          set({ purchasesPT: ptList });
          setLocalStorage("slp_purchases_pt", ptList);
        } else {
          const nonPtList = get().purchasesNonPT.map((p) => p.kode_unik === parentId ? { ...p, qty_terima_kg: totalQty, tgl_terima_barang: latestDate || "" } : p);
          set({ purchasesNonPT: nonPtList });
          setLocalStorage("slp_purchases_nopt", nonPtList);
        }
      }
    }
  },

  // Synchronization Setters
  setCustomers: (customers) => {
    set({ customers });
    setLocalStorage("slp_customers", customers);
  },
  setProducts: (products) => {
    set({ products });
    setLocalStorage("slp_products", products);
  },
  setSales: (sales) => {
    set({ sales });
    setLocalStorage("slp_sales", sales);
  },
  setPurchasesPT: (purchasesPT) => {
    set({ purchasesPT });
    setLocalStorage("slp_purchases_pt", purchasesPT);
  },
  setPurchasesNonPT: (purchasesNonPT) => {
    set({ purchasesNonPT });
    setLocalStorage("slp_purchases_nopt", purchasesNonPT);
  },
  setPayments: (payments) => {
    set({ payments });
    setLocalStorage("slp_payments", payments);
  },
  setVendors: (vendors) => {
    set({ vendors });
    setLocalStorage("slp_vendors", vendors);
  },
  setGoodsReceiveNotes: (goodsReceiveNotes) => {
    set({ goodsReceiveNotes });
    setLocalStorage("slp_goods_receive_notes", goodsReceiveNotes);
  },
}));
