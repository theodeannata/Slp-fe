"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

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
    language,
    setCustomers,
    setVendors,
    setProducts,
    setSales,
    setPayments,
    setPurchasesPT,
    setPurchasesNonPT,
    isMockMode,
    role,
  } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync theme class on mount/change
  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    root.lang = language;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, language]);

  // Auth Routing Guard
  useEffect(() => {
    if (mounted) {
      const isRegisterAllowed = process.env.NEXT_PUBLIC_ALLOW_REGISTRATION === "true";
      const isPublicPage = pathname === "/login" || (pathname === "/register" && isRegisterAllowed);

      if (pathname === "/register" && !isRegisterAllowed) {
        router.push("/login");
        return;
      }

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
        const [custs, vends, prods, salesList, paymentsList] = await Promise.all([
          api.customers.list(),
          api.vendors.list(),
          api.products.list(),
          api.sales.list(),
          api.payments.list(),
        ]);
        setCustomers(custs);
        setVendors(vends);
        setProducts(prods);
        setSales(salesList);
        setPayments(paymentsList);

        if (role === "master" || role === "db_admin") {
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
  }, [user, isMockMode, role, mounted, setCustomers, setVendors, setProducts, setSales, setPayments, setPurchasesPT, setPurchasesNonPT]);

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
      <TooltipProvider>
        {isPublicPage || isPrintPage ? (
          children
        ) : (
          <div className="flex h-screen overflow-hidden bg-background">
            {/* Mobile backdrop */}
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-45 md:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
            )}

            <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Mobile Top Header */}
              <header className="flex md:hidden items-center justify-between px-6 py-4 bg-sidebar-bg border-b border-sidebar-border z-20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2 select-none">
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center text-zinc-50 dark:text-zinc-950 font-bold text-base border border-zinc-200 dark:border-zinc-800">
                      S
                    </div>
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50 tracking-tight">
                      SLP ERP
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
              </header>

              <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-10 relative">
                {children}
              </main>
            </div>
          </div>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
export default Providers;
