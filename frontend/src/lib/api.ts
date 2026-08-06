import { supabase } from "./supabaseClient";
import { useAppStore, Customer, Product, Sale, Purchase, Payment, Vendor } from "./store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Standard client wrapper
async function fetchFromBackend(endpoint: string, options: RequestInit = {}) {
  const isMockMode = useAppStore.getState().isMockMode;

  if (isMockMode) {
    // If mock mode is enabled, we intercept and yield local mocks
    return mockHandler(endpoint, options);
  }

  // Real API path
  let token = null;
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "API Request failed";
    try {
      const err = await response.json();
      if (err.detail) {
        if (typeof err.detail === "string") {
          errorDetail = err.detail;
        } else if (Array.isArray(err.detail)) {
          // Standard FastAPI Validation error
          errorDetail = err.detail
            .map((d: any) => `${d.loc?.join(".") || "field"}: ${d.msg}`)
            .join(", ");
        }
      }
    } catch {
      errorDetail = `HTTP Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

// Mock handler fallback
async function mockHandler(endpoint: string, options: RequestInit = {}) {
  const store = useAppStore.getState();
  const method = options.method || "GET";

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Customers
  if (endpoint.startsWith("/api/v1/customers")) {
    const idParam = endpoint.replace("/api/v1/customers", "").replace(/^\//, "");
    const cleanId = idParam.split("?")[0];

    if (method === "GET") {
      if (cleanId) {
        const item = store.customers.find((c) => c.customer_id === cleanId);
        if (!item) throw new Error("Customer not found");
        return item;
      }
      return store.customers;
    }

    if (method === "POST") {
      const body = JSON.parse(options.body as string) as Customer;
      const name = body.customer.trim();
      let firstChar = name[0] ? name[0].toUpperCase() : 'C';
      if (!/[A-Z]/.test(firstChar)) {
        firstChar = 'C';
      }
      const existing = store.customers.filter((c) => c.customer_id.startsWith(firstChar));
      let count = existing.length;
      let newId = "";
      while (true) {
        newId = `${firstChar}${String(count + 1).padStart(3, "0")}`;
        if (!store.customers.some((c) => c.customer_id === newId)) {
          break;
        }
        count++;
      }
      body.customer_id = newId;
      body.is_active = body.is_active !== false;
      store.addCustomer(body);
      return body;
    }

    if (method === "PUT") {
      const body = JSON.parse(options.body as string) as Partial<Customer>;
      store.updateCustomer(cleanId, body);
      return { ...store.customers.find((c) => c.customer_id === cleanId), ...body };
    }

    if (method === "DELETE") {
      if (store.role !== "master") {
        throw new Error("Access denied: Only Master role can delete customer records.");
      }
      store.deleteCustomer(cleanId);
      return { success: true };
    }
  }

  // Vendors
  if (endpoint.startsWith("/api/v1/vendors")) {
    const idParam = endpoint.replace("/api/v1/vendors", "").replace(/^\//, "");
    const cleanId = idParam.split("?")[0];

    if (method === "GET") {
      if (cleanId) {
        const item = store.vendors.find((v) => v.vendor_id === cleanId);
        if (!item) throw new Error("Vendor not found");
        return item;
      }
      return store.vendors;
    }

    if (method === "POST") {
      const body = JSON.parse(options.body as string) as Vendor;
      const name = body.vendor.trim();
      let firstChar = name[0] ? name[0].toUpperCase() : 'V';
      if (!/[A-Z]/.test(firstChar)) {
        firstChar = 'V';
      }
      const existing = store.vendors.filter((v) => v.vendor_id.startsWith(firstChar));
      let count = existing.length;
      let newId = "";
      while (true) {
        newId = `${firstChar}${String(count + 1).padStart(3, "0")}`;
        if (!store.vendors.some((v) => v.vendor_id === newId)) {
          break;
        }
        count++;
      }
      body.vendor_id = newId;
      store.addVendor(body);
      return body;
    }

    if (method === "PUT") {
      const body = JSON.parse(options.body as string) as Partial<Vendor>;
      store.updateVendor(cleanId, body);
      return { ...store.vendors.find((v) => v.vendor_id === cleanId), ...body };
    }

    if (method === "DELETE") {
      if (store.role !== "master" && store.role !== "db_admin") {
        throw new Error("Access denied: Only Master or DB Admin roles can delete vendor records.");
      }
      store.deleteVendor(cleanId);
      return { success: true };
    }
  }

  // Products
  if (endpoint.startsWith("/api/v1/products")) {
    const idParam = endpoint.replace("/api/v1/products", "").replace(/^\//, "");
    const cleanCode = idParam.split("?")[0];

    if (method === "GET") {
      if (cleanCode) {
        const item = store.products.find((p) => p.kode_product === cleanCode);
        if (!item) throw new Error("Product not found");
        return item;
      }
      return store.products;
    }

    if (method === "POST") {
      const body = JSON.parse(options.body as string) as Product;
      if (store.products.some((p) => p.kode_product === body.kode_product)) {
        throw new Error(`Product ${body.kode_product} already exists`);
      }
      store.addProduct(body);
      return body;
    }

    if (method === "PUT") {
      const body = JSON.parse(options.body as string) as Partial<Product>;
      store.updateProduct(cleanCode, body);
      return { ...store.products.find((p) => p.kode_product === cleanCode), ...body };
    }

    if (method === "DELETE") {
      if (store.role !== "master") {
        throw new Error("Access denied: Only Master role can delete product records.");
      }
      store.deleteProduct(cleanCode);
      return { success: true };
    }
  }

  // Sales
  if (endpoint.startsWith("/api/v1/sales")) {
    const idParam = endpoint.replace("/api/v1/sales", "").replace(/^\//, "");
    const cleanCode = decodeURIComponent(idParam.split("?")[0]);

    if (method === "GET") {
      if (cleanCode && !cleanCode.startsWith("?")) {
        const item = store.sales.find((s) => s.kode_unik === cleanCode);
        if (!item) throw new Error("Invoice record not found");
        return item;
      }
      // Check query parameter source
      const urlParams = new URLSearchParams(endpoint.includes("?") ? endpoint.split("?")[1] : "");
      const source = urlParams.get("source");
      const tab = urlParams.get("tab");
      const year = urlParams.get("year");

      // Resolve tab and year
      let resolvedTab = tab;
      let resolvedYear = year;
      if (source) {
        if (source === "non_pt") {
          resolvedTab = "non-pt";
          resolvedYear = "2022";
        } else if (source === "2022") {
          resolvedTab = "pt";
          resolvedYear = "2022";
        } else {
          resolvedTab = "pt";
          resolvedYear = source;
        }
      }

      let list = store.sales;
      if (resolvedTab === "non-pt") {
        list = list.filter(
          (s) =>
            s.sumber === "non_pt" ||
            s.harga_exc === null ||
            s.harga_exc === undefined ||
            s.harga_exc === 0
        );
      } else if (resolvedTab === "pt") {
        list = list.filter(
          (s) =>
            s.sumber !== "non_pt" &&
            s.harga_exc !== null &&
            s.harga_exc !== undefined &&
            s.harga_exc > 0
        );
      }

      if (resolvedYear) {
        list = list.filter((s) => s.tgl && s.tgl.substring(0, 4) === resolvedYear);
      }
      return [...list].sort((a, b) => new Date(b.tgl).getTime() - new Date(a.tgl).getTime());
    }

    if (method === "POST") {
      const body = JSON.parse(options.body as string) as Sale;
      if (store.sales.some((s) => s.kode_unik === body.kode_unik)) {
        throw new Error(`Invoice unique code ${body.kode_unik} already exists`);
      }
      // Automatically calculate balance
      body.terbayar = body.terbayar || 0;
      body.sisa = Math.max(0, body.total_include - body.terbayar);
      body.status_tempo = body.sisa === 0 ? "Lunas" : "Belum Lunas";
      store.addSale(body);
      return body;
    }

    if (method === "PUT") {
      const body = JSON.parse(options.body as string) as Partial<Sale>;
      store.updateSale(cleanCode, body);
      const original = store.sales.find((s) => s.kode_unik === cleanCode);
      if (original) {
        const updated = { ...original, ...body };
        updated.sisa = Math.max(0, updated.total_include - updated.terbayar);
        updated.status_tempo = updated.sisa === 0 ? "Lunas" : "Belum Lunas";
        store.updateSale(cleanCode, updated);
        return updated;
      }
      return body;
    }

    if (method === "DELETE") {
      if (store.role !== "master") {
        throw new Error("Access denied: Only Master role can delete sales records.");
      }
      store.deleteSale(cleanCode);
      return { success: true };
    }
  }

  // Purchases Mock Module
  if (endpoint.startsWith("/api/v1/purchases")) {
    const isPT = endpoint.includes("/pt");
    const idParam = endpoint.replace(isPT ? "/api/v1/purchases/pt" : "/api/v1/purchases/non-pt", "").replace(/^\//, "");
    const cleanCode = decodeURIComponent(idParam.split("?")[0]);

    const sanitizePurchase = (p: Purchase) => {
      if (store.role === "admin") {
        return {
          ...p,
          dpp: null,
          harga: null,
          total: null,
          jual: null,
          total_jual: null,
          untung: null,
          persen: null,
          tgl_bayar: null,
        };
      }
      return p;
    };

    if (method === "GET") {
      if (cleanCode && !cleanCode.startsWith("?")) {
        const item = isPT
          ? store.purchasesPT.find((p) => p.kode_unik === cleanCode)
          : store.purchasesNonPT.find((p) => p.kode_unik === cleanCode);
        if (!item) throw new Error(`${isPT ? "PT" : "Non-PT"} Purchase record not found`);
        
        // Embed mock GRNs
        const grns = store.goodsReceiveNotes.filter((g) => isPT ? g.pembelian_id === cleanCode : g.beli_non_pt_id === cleanCode);
        const itemWithGrns = { ...item, goods_receive_notes: grns };
        return sanitizePurchase(itemWithGrns);
      }

      const urlParams = new URLSearchParams(endpoint.includes("?") ? endpoint.split("?")[1] : "");
      const year = urlParams.get("year");
      let list = isPT ? store.purchasesPT : store.purchasesNonPT;
      if (year) {
        list = list.filter((p) => p.tgl_po && p.tgl_po.substring(0, 4) === year);
      }

      // Embed mock GRNs for lists
      return list.map((item) => {
        const grns = store.goodsReceiveNotes.filter((g) => isPT ? g.pembelian_id === item.kode_unik : g.beli_non_pt_id === item.kode_unik);
        return sanitizePurchase({ ...item, goods_receive_notes: grns });
      });
    }

    if (method === "POST") {
      if (store.role === "admin") {
        throw new Error("Access denied: Admin role does not have permission to modify purchase orders.");
      }
      const body = JSON.parse(options.body as string) as Purchase;
      if (isPT) {
        store.addPurchasePT(body);
      } else {
        store.addPurchaseNonPT(body);
      }
      return body;
    }

    if (method === "PUT") {
      const body = JSON.parse(options.body as string) as Partial<Purchase>;
      let updateData = { ...body };
      if (store.role === "admin") {
        // Only allow operational columns update
        const allowed = ["tgl_po", "tgl_terima_barang", "qty_terima_kg"];
        updateData = Object.keys(body)
          .filter((key) => allowed.includes(key))
          .reduce((obj, key) => {
            obj[key] = (body as any)[key];
            return obj;
          }, {} as any);
      }
      if (isPT) {
        store.updatePurchasePT(cleanCode, updateData);
        return { ...store.purchasesPT.find((p) => p.kode_unik === cleanCode), ...updateData };
      } else {
        store.updatePurchaseNonPT(cleanCode, updateData);
        return { ...store.purchasesNonPT.find((p) => p.kode_unik === cleanCode), ...updateData };
      }
    }

    if (method === "DELETE") {
      if (store.role === "admin") {
        throw new Error("Access denied: Admin role does not have permission to modify purchase orders.");
      }
      if (isPT) {
        store.deletePurchasePT(cleanCode);
      } else {
        store.deletePurchaseNonPT(cleanCode);
      }
      return { success: true };
    }
  }

  // Goods Receive Notes
  if (endpoint.startsWith("/api/v1/goods-receive-notes")) {
    const idParam = endpoint.replace("/api/v1/goods-receive-notes", "").replace(/^\//, "");
    const cleanId = idParam.split("?")[0];

    if (method === "GET") {
      if (cleanId) {
        const item = store.goodsReceiveNotes.find((g) => g.id === cleanId);
        if (!item) throw new Error("Goods Receive Note not found");
        return item;
      }
      // Check query parameter filters
      const urlParams = new URLSearchParams(endpoint.includes("?") ? endpoint.split("?")[1] : "");
      const pembelianId = urlParams.get("pembelian_id");
      const beliNonPtId = urlParams.get("beli_non_pt_id");
      
      let list = store.goodsReceiveNotes;
      if (pembelianId) {
        list = list.filter((g) => g.pembelian_id === pembelianId);
      }
      if (beliNonPtId) {
        list = list.filter((g) => g.beli_non_pt_id === beliNonPtId);
      }
      return list;
    }

    if (method === "POST") {
      const body = JSON.parse(options.body as string);
      
      // Auto resolve product details in mock mode
      let kode_barang = null;
      let barang = null;
      if (body.pembelian_id) {
        const parent = store.purchasesPT.find((p) => p.kode_unik === body.pembelian_id);
        if (parent) {
          kode_barang = parent.kode_barang;
          barang = parent.barang;
        }
      } else if (body.beli_non_pt_id) {
        const parent = store.purchasesNonPT.find((p) => p.kode_unik === body.beli_non_pt_id);
        if (parent) {
          kode_barang = parent.kode_barang;
          barang = parent.barang;
        }
      }

      const newGrn = {
        id: `grn-${Math.floor(Math.random() * 100000)}`,
        pembelian_id: body.pembelian_id || null,
        beli_non_pt_id: body.beli_non_pt_id || null,
        kode_barang,
        barang,
        tgl_terima: body.tgl_terima,
        qty_terima_kg: Number(body.qty_terima_kg) || 0,
        note: body.note || null,
        created_at: new Date().toISOString(),
      };
      store.addGoodsReceiveNote(newGrn);
      return newGrn;
    }

    if (method === "PUT") {
      const body = JSON.parse(options.body as string);
      
      // Admin update restrictions check: parent PO references cannot be modified
      if (store.role === "admin") {
        const existingGrn = store.goodsReceiveNotes.find((g) => g.id === cleanId);
        if (existingGrn) {
          if ((body.pembelian_id && body.pembelian_id !== existingGrn.pembelian_id) ||
              (body.beli_non_pt_id && body.beli_non_pt_id !== existingGrn.beli_non_pt_id)) {
            throw new Error("Access denied: Admin role does not have permission to modify reference IDs on Goods Receive Notes.");
          }
        }
      }

      const updateData = {
        tgl_terima: body.tgl_terima,
        qty_terima_kg: Number(body.qty_terima_kg),
        note: body.note,
      };
      
      store.updateGoodsReceiveNote(cleanId, updateData);
      return { ...store.goodsReceiveNotes.find((g) => g.id === cleanId), ...updateData };
    }

    if (method === "DELETE") {
      if (store.role !== "master" && store.role !== "db_admin") {
        throw new Error("Access denied: Only Master and DB Admin roles have permission to delete Goods Receive Notes.");
      }
      store.deleteGoodsReceiveNote(cleanId);
      return { success: true };
    }
  }

  // Payments
  if (endpoint.startsWith("/api/v1/payments")) {
    if (method === "GET") return store.payments;
    if (method === "POST") {
      const body = JSON.parse(options.body as string) as Payment;
      store.addPayment(body);
      return body;
    }
  }

  // Users
  if (endpoint.startsWith("/api/v1/users")) {
    const idParam = endpoint.replace("/api/v1/users", "").replace(/^\//, "");
    const cleanId = idParam.split("?")[0];

    if (method === "POST") {
      const body = JSON.parse(options.body as string);
      return {
        message: "Mock user created successfully.",
        user_id: `mock-user-${Math.floor(Math.random() * 10000)}`,
        email: body.email,
        role: body.role,
      };
    }
    if (method === "DELETE") {
      return { success: true };
    }
  }

  throw new Error("Endpoint not mocked");
}

// Client API object export
export const api = {
  customers: {
    list: () => fetchFromBackend("/api/v1/customers?limit=10000"),
    get: (id: string) => fetchFromBackend(`/api/v1/customers/${id}`),
    create: (data: Customer) =>
      fetchFromBackend("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Customer>) =>
      fetchFromBackend(`/api/v1/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchFromBackend(`/api/v1/customers/${id}`, {
        method: "DELETE",
      }),
  },
  vendors: {
    list: () => fetchFromBackend("/api/v1/vendors?limit=10000"),
    get: (id: string) => fetchFromBackend(`/api/v1/vendors/${id}`),
    create: (data: Vendor) =>
      fetchFromBackend("/api/v1/vendors", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Vendor>) =>
      fetchFromBackend(`/api/v1/vendors/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchFromBackend(`/api/v1/vendors/${id}`, {
        method: "DELETE",
      }),
  },
  products: {
    list: () => fetchFromBackend("/api/v1/products?limit=10000"),
    get: (code: string) => fetchFromBackend(`/api/v1/products/${code}`),
    create: (data: Product) =>
      fetchFromBackend("/api/v1/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (code: string, data: Partial<Product>) =>
      fetchFromBackend(`/api/v1/products/${code}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (code: string) =>
      fetchFromBackend(`/api/v1/products/${code}`, {
        method: "DELETE",
      }),
  },
  sales: {
    list: (source?: string, tab?: string, year?: string) => {
      let query = "?limit=10000";
      if (source) query += `&source=${encodeURIComponent(source)}`;
      if (tab) query += `&tab=${encodeURIComponent(tab)}`;
      if (year) query += `&year=${encodeURIComponent(year)}`;
      return fetchFromBackend(`/api/v1/sales${query}`);
    },
    get: (code: string) => fetchFromBackend(`/api/v1/sales/${encodeURIComponent(code)}`),
    create: (data: Sale) =>
      fetchFromBackend("/api/v1/sales", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (code: string, data: Partial<Sale>) =>
      fetchFromBackend(`/api/v1/sales/${encodeURIComponent(code)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (code: string) =>
      fetchFromBackend(`/api/v1/sales/${encodeURIComponent(code)}`, {
        method: "DELETE",
      }),
  },
  purchases: {
    listPT: (year?: string) => {
      const query = year ? `?limit=10000&year=${encodeURIComponent(year)}` : "?limit=10000";
      return fetchFromBackend(`/api/v1/purchases/pt${query}`);
    },
    createPT: (data: Purchase) =>
      fetchFromBackend("/api/v1/purchases/pt", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updatePT: (code: string, data: Partial<Purchase>) =>
      fetchFromBackend(`/api/v1/purchases/pt/${encodeURIComponent(code)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deletePT: (code: string) =>
      fetchFromBackend(`/api/v1/purchases/pt/${encodeURIComponent(code)}`, {
        method: "DELETE",
      }),
    listNonPT: (year?: string) => {
      const query = year ? `?limit=10000&year=${encodeURIComponent(year)}` : "?limit=10000";
      return fetchFromBackend(`/api/v1/purchases/non-pt${query}`);
    },
    createNonPT: (data: Purchase) =>
      fetchFromBackend("/api/v1/purchases/non-pt", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateNonPT: (code: string, data: Partial<Purchase>) =>
      fetchFromBackend(`/api/v1/purchases/non-pt/${encodeURIComponent(code)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteNonPT: (code: string) =>
      fetchFromBackend(`/api/v1/purchases/non-pt/${encodeURIComponent(code)}`, {
        method: "DELETE",
      }),
  },
  payments: {
    list: () => fetchFromBackend("/api/v1/payments?limit=10000"),
    create: (data: Payment) =>
      fetchFromBackend("/api/v1/payments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  goodsReceiveNotes: {
    list: (pembelianId?: string, beliNonPtId?: string) => {
      let query = "?limit=10000";
      if (pembelianId) query += `&pembelian_id=${encodeURIComponent(pembelianId)}`;
      if (beliNonPtId) query += `&beli_non_pt_id=${encodeURIComponent(beliNonPtId)}`;
      return fetchFromBackend(`/api/v1/goods-receive-notes${query}`);
    },
    get: (id: string) => fetchFromBackend(`/api/v1/goods-receive-notes/${id}`),
    create: (data: any) =>
      fetchFromBackend("/api/v1/goods-receive-notes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchFromBackend(`/api/v1/goods-receive-notes/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchFromBackend(`/api/v1/goods-receive-notes/${id}`, {
        method: "DELETE",
      }),
  },
  migrate: {
    trigger: () =>
      fetchFromBackend("/api/v1/migrate", {
        method: "POST",
      }),
  },
  bankStatements: {
    list: async (periodMonth?: string, account?: string) => {
      try {
        let url = `${API_BASE_URL}/api/v1/bank-statements?limit=10000`;
        if (periodMonth && periodMonth !== "ALL") url += `&period_month=${encodeURIComponent(periodMonth)}`;
        if (account && account !== "ALL") url += `&account=${encodeURIComponent(account)}`;
        
        const res = await fetch(url);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn("Backend API gateway error, falling back to direct Supabase query:", err);
      }

      // Direct Supabase JS Client fallback
      if (supabase) {
        let sbQuery = supabase.from("bank_pt").select("*").order("tanggal", { ascending: true }).limit(10000);
        if (periodMonth && periodMonth !== "ALL") {
          sbQuery = sbQuery.eq("period_month", periodMonth);
        }
        if (account && account !== "ALL") {
          sbQuery = sbQuery.eq("account", account);
        }
        const { data, error } = await sbQuery;
        if (!error && data && data.length > 0) {
          return data;
        }
      }
      return [];
    },
    create: (data: any) =>
      fetchFromBackend("/api/v1/bank-statements", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchFromBackend(`/api/v1/bank-statements/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchFromBackend(`/api/v1/bank-statements/${id}`, {
        method: "DELETE",
      }),
    match: (bankPtId: string, penjualanKodeUnik: string, allocatedAmount: number) =>
      fetchFromBackend("/api/v1/bank-statements/match", {
        method: "POST",
        body: JSON.stringify({
          bank_pt_id: bankPtId,
          penjualan_kode_unik: penjualanKodeUnik,
          allocated_amount: allocatedAmount,
        }),
      }),
    unmatch: (bankPtId: string) =>
      fetchFromBackend(`/api/v1/bank-statements/unmatch/${bankPtId}`, {
        method: "POST",
      }),
    autoReconcile: (periodMonth?: string) => {
      let query = "";
      if (periodMonth && periodMonth !== "ALL") query = `?period_month=${encodeURIComponent(periodMonth)}`;
      return fetchFromBackend(`/api/v1/bank-statements/auto-reconcile${query}`, {
        method: "POST",
      });
    },
    upload: async (file: File, periodMonth: string = "2026-06") => {
      const formData = new FormData();
      formData.append("file", file);
      const isMockMode = useAppStore.getState().isMockMode;
      if (isMockMode) return [];

      let token = null;
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      }
      const response = await fetch(
        `${API_BASE_URL}/api/v1/bank-statements/upload?period_month=${encodeURIComponent(periodMonth)}`,
        {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        }
      );
      if (!response.ok) throw new Error("Failed to upload statement file.");
      return response.json();
    },
  },
  users: {
    create: (data: { email: string; password?: string; role: string }) =>
      fetchFromBackend("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchFromBackend(`/api/v1/users/${id}`, {
        method: "DELETE",
      }),
    changePassword: (id: string, password: string) =>
      fetchFromBackend(`/api/v1/users/${id}/password`, {
        method: "PUT",
        body: JSON.stringify({ password }),
      }),
  },
};
export default api;
