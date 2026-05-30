import { supabase } from "./supabaseClient";
import { useAppStore, Customer, Product, Sale, Purchase, Payment } from "./store";

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

  return response.json();
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
      if (store.customers.some((c) => c.customer_id === body.customer_id)) {
        throw new Error(`Customer ID ${body.customer_id} already exists`);
      }
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
      let list = store.sales;
      if (source) {
        if (source === "non_pt") {
          list = list.filter((s) => s.sumber === "non_pt");
        } else {
          list = list.filter((s) => s.tgl && s.tgl.substring(0, 4) === source);
        }
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

  // Purchases (Admin blocked module)
  if (endpoint.startsWith("/api/v1/purchases")) {
    if (store.role !== "master") {
      throw new Error("Access denied: Purchase modules are restricted to Master role users only.");
    }

    if (endpoint.includes("/pt")) {
      const idParam = endpoint.replace("/api/v1/purchases/pt", "").replace(/^\//, "");
      const cleanCode = decodeURIComponent(idParam.split("?")[0]);

      if (method === "GET") {
        if (cleanCode && !cleanCode.startsWith("?")) {
          const item = store.purchasesPT.find((p) => p.kode_unik === cleanCode);
          if (!item) throw new Error("PT Purchase record not found");
          return item;
        }
        // Handle mock year filter
        const urlParams = new URLSearchParams(endpoint.includes("?") ? endpoint.split("?")[1] : "");
        const year = urlParams.get("year");
        let list = store.purchasesPT;
        if (year) {
          list = list.filter((p) => p.tgl_po && p.tgl_po.substring(0, 4) === year);
        }
        return list;
      }
      if (method === "POST") {
        const body = JSON.parse(options.body as string) as Purchase;
        store.addPurchasePT(body);
        return body;
      }
      if (method === "PUT") {
        const body = JSON.parse(options.body as string) as Partial<Purchase>;
        store.updatePurchasePT(cleanCode, body);
        return { ...store.purchasesPT.find((p) => p.kode_unik === cleanCode), ...body };
      }
      if (method === "DELETE") {
        store.deletePurchasePT(cleanCode);
        return { success: true };
      }
    }

    if (endpoint.includes("/non-pt")) {
      const idParam = endpoint.replace("/api/v1/purchases/non-pt", "").replace(/^\//, "");
      const cleanCode = decodeURIComponent(idParam.split("?")[0]);

      if (method === "GET") {
        if (cleanCode && !cleanCode.startsWith("?")) {
          const item = store.purchasesNonPT.find((p) => p.kode_unik === cleanCode);
          if (!item) throw new Error("Non-PT Purchase record not found");
          return item;
        }
        // Handle mock year filter
        const urlParams = new URLSearchParams(endpoint.includes("?") ? endpoint.split("?")[1] : "");
        const year = urlParams.get("year");
        let list = store.purchasesNonPT;
        if (year) {
          list = list.filter((p) => p.tgl_po && p.tgl_po.substring(0, 4) === year);
        }
        return list;
      }
      if (method === "POST") {
        const body = JSON.parse(options.body as string) as Purchase;
        store.addPurchaseNonPT(body);
        return body;
      }
      if (method === "PUT") {
        const body = JSON.parse(options.body as string) as Partial<Purchase>;
        store.updatePurchaseNonPT(cleanCode, body);
        return { ...store.purchasesNonPT.find((p) => p.kode_unik === cleanCode), ...body };
      }
      if (method === "DELETE") {
        store.deletePurchaseNonPT(cleanCode);
        return { success: true };
      }
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

  // Migrate Ingestion
  if (endpoint.startsWith("/api/v1/migrate")) {
    if (method === "POST") {
      await store.triggerMigration();
      return { status: "success", detail: "Excel background data migration triggered" };
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
    list: (source?: string) => {
      const query = source ? `?limit=10000&source=${encodeURIComponent(source)}` : "?limit=10000";
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
  migrate: {
    trigger: () =>
      fetchFromBackend("/api/v1/migrate", {
        method: "POST",
      }),
  },
};
export default api;
