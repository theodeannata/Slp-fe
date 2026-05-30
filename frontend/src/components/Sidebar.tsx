"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { ThemeToggle } from "./ThemeToggle";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  FileText,
  CreditCard,
  Database,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Upload,
  Printer,
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Products", href: "/products", icon: ShoppingBag },
  { name: "Sales Invoices", href: "/sales", icon: FileText },
  { name: "Invoicing & Print", href: "/invoicing", icon: Printer },
  {
    name: "Purchases PO",
    href: "/purchases",
    icon: CreditCard,
    restricted: true,
  },
  {
    name: "Payments Ledger",
    href: "/payments",
    icon: Database,
    restricted: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    isMockMode,
    setMockMode,
    role,
    setAuth,
    user,
    logout,
  } = useAppStore();

  const visibleNavItems = navItems.filter((item) => !(item.restricted && role === "admin"));

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const toggleRole = () => {
    const nextRole = role === "master" ? "admin" : "master";
    setAuth(
      user
        ? { ...user, email: `${nextRole}@slp.id` }
        : { email: `${nextRole}@slp.id`, id: "demo-user-id" },
      nextRole
    );
  };

  return (
    <aside
      className={`h-screen border-r border-sidebar-border bg-sidebar-bg flex flex-col justify-between transition-all duration-300 relative z-30
        ${sidebarCollapsed ? "w-20" : "w-64"}`}
    >
      {/* Top Section */}
      <div>
        {/* Header Logo */}
        <div className="flex items-center justify-between px-4 py-6 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-3 overflow-hidden select-none">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center text-zinc-50 dark:text-zinc-950 font-bold text-lg shrink-0 border border-zinc-200 dark:border-zinc-800">
              S
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg text-zinc-900 dark:text-zinc-50 truncate tracking-tight">
                SLP ERP System
              </span>
            )}
          </Link>

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-sidebar-bg border border-sidebar-border flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shadow-sm z-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            const isRestrictedAndLocked = item.restricted && role === "admin";
            const Icon = item.icon;

            return (
              <Link key={item.name} href={item.href} className="block relative">
                <div
                  className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group cursor-pointer
                    ${
                      isActive
                        ? "bg-primary-light text-primary font-medium"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                    }
                    ${isRestrictedAndLocked ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105
                        ${isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}
                    />
                    {!sidebarCollapsed && (
                      <span className="text-sm truncate">{item.name}</span>
                    )}
                  </div>

                  {!sidebarCollapsed && isRestrictedAndLocked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-650 dark:text-zinc-300 font-semibold tracking-wide">
                      LOCKED
                    </span>
                  )}
                </div>
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Panel */}
      <div className="p-3 border-t border-sidebar-border space-y-3 bg-zinc-50/20 dark:bg-zinc-900/10">
        {/* Environment Settings Controls */}
        {!sidebarCollapsed && (
          <div className="space-y-2.5 p-2.5 rounded-2xl bg-card-bg border border-card-border shadow-sm text-xs">
            {/* Mode switch */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Testing Mode:</span>
              <button
                onClick={() => setMockMode(!isMockMode)}
                className={`px-2 py-1 rounded font-bold transition-all cursor-pointer text-[10px] uppercase tracking-wider border
                  ${
                    isMockMode
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-250 dark:border-zinc-750"
                      : "bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 border-transparent"
                  }`}
              >
                {isMockMode ? "Mock Cache" : "API Client"}
              </button>
            </div>

            {/* Role Switch */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Session Role:</span>
              <button
                onClick={toggleRole}
                className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer font-bold"
              >
                <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="capitalize text-zinc-800 dark:text-zinc-250">{role}</span>
              </button>
            </div>
          </div>
        )}

        {/* User Info & Settings Action */}
        <div className="flex items-center justify-between gap-2">
          {/* Theme & Profile Details */}
          <div className="flex items-center gap-2 overflow-hidden">
            <ThemeToggle />
            {!sidebarCollapsed && (
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200">
                  {user?.email || "unknown@slp.id"}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {role}
                </span>
              </div>
            )}
          </div>

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-card-border bg-card-bg text-slate-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center shadow-sm"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
export default Sidebar;
