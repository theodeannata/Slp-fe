"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "./Sidebar";

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    theme,
    setCustomers,
    setProducts,
    setSales,
    setPayments,
    setPurchasesPT,
    setPurchasesNonPT,
    isMockMode,
    role,
  } = useAppStore();
  const [mounted, setMounted] = useState(false);

  // Sync theme class on mount/change
  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Auth Routing Guard
  useEffect(() => {
    if (mounted) {
      const isPublicPage = pathname === "/login" || pathname === "/register";
      if (!user && !isPublicPage) {
        router.push("/login");
      } else if (user && isPublicPage) {
        router.push("/");
      }
    }
  }, [user, pathname, router, mounted]);

  // Sync Live Database Data
  useEffect(() => {
    if (!mounted || !user) return;
    if (isMockMode) return;

    const fetchInitialData = async () => {
      try {
        const [custs, prods, salesList, paymentsList] = await Promise.all([
          api.customers.list(),
          api.products.list(),
          api.sales.list(),
          api.payments.list(),
        ]);
        setCustomers(custs);
        setProducts(prods);
        setSales(salesList);
        setPayments(paymentsList);

        if (role === "master") {
          const [ptList, nonPtList] = await Promise.all([
            api.purchases.listPT(),
            api.purchases.listNonPT(),
          ]);
          setPurchasesPT(ptList);
          setPurchasesNonPT(nonPtList);
        }
      } catch (err) {
        console.error("Failed to load initial live data from backend:", err);
      }
    };

    fetchInitialData();
  }, [user, isMockMode, role, mounted, setCustomers, setProducts, setSales, setPayments, setPurchasesPT, setPurchasesNonPT]);

  if (!mounted) {
    // Avoid hydration flashing
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 dark:border-zinc-200 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPublicPage = pathname === "/login" || pathname === "/register";
  const isPrintPage = pathname.startsWith("/sales/print") || pathname.startsWith("/purchases/print");

  return (
    <QueryClientProvider client={queryClient}>
      {isPublicPage || isPrintPage ? (
        children
      ) : (
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-background p-6 lg:p-10 relative">
            {children}
          </main>
        </div>
      )}
    </QueryClientProvider>
  );
}
export default Providers;
