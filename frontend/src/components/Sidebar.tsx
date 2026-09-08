"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
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
  Truck,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItemDef {
  key: keyof ReturnType<typeof useTranslation>["t"]["nav"];
  href: string;
  icon: any;
  roles: ("admin" | "master" | "db_admin")[];
}

const navItems: NavItemDef[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "master", "db_admin"] },
  { key: "customers", href: "/customers", icon: Users, roles: ["admin", "master", "db_admin"] },
  { key: "vendors", href: "/vendors", icon: Truck, roles: ["admin", "master", "db_admin"] },
  { key: "products", href: "/products", icon: ShoppingBag, roles: ["admin", "master", "db_admin"] },
  { key: "salesInvoices", href: "/sales", icon: FileText, roles: ["admin", "master", "db_admin"] },
  { key: "invoicingPrint", href: "/invoicing", icon: Printer, roles: ["admin", "master", "db_admin"] },
  {
    key: "purchasesPO",
    href: "/purchases",
    icon: CreditCard,
    roles: ["master", "db_admin"],
  },
  {
    key: "goodsReceiveNotes",
    href: "/goods-receive-notes",
    icon: Truck,
    roles: ["admin", "master", "db_admin"],
  },
  {
    key: "paymentsLedger",
    href: "/payments",
    icon: Database,
    roles: ["admin", "master", "db_admin"],
  },
  {
    key: "bankStatements",
    href: "/bank-statements",
    icon: CreditCard,
    roles: ["master", "db_admin"],
  },
  {
    key: "userManagement",
    href: "/users",
    icon: Users,
    roles: ["db_admin"],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { t } = useTranslation();
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

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role as any));

  const handleLogout = () => {
    logout();
    if (onMobileClose) onMobileClose();
    router.push("/login");
  };

  const toggleRole = () => {
    const roles: ("admin" | "master" | "db_admin")[] = ["admin", "master", "db_admin"];
    const currentIndex = roles.indexOf(role as any);
    const nextRole = roles[currentIndex === -1 ? 0 : (currentIndex + 1) % roles.length];
    setAuth(
      user
        ? { ...user, email: `${nextRole}@slp.id` }
        : { email: `${nextRole}@slp.id`, id: "demo-user-id" },
      nextRole
    );
  };

  const showExtra = !sidebarCollapsed || !!onMobileClose;

  return (
    <aside
      className={`h-screen border-r border-sidebar-border bg-sidebar-bg flex flex-col justify-between transition-all duration-300 z-50
        fixed inset-y-0 left-0 md:relative md:translate-x-0 md:z-30
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        ${sidebarCollapsed ? "md:w-20" : "md:w-64"} w-64`}
    >
      {/* Top Section */}
      <div>
        {/* Header Logo */}
        <div className="flex items-center justify-between px-4 py-6 border-b border-sidebar-border relative">
          <Link href="/" onClick={onMobileClose} className="flex items-center gap-3 overflow-hidden select-none">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center text-zinc-50 dark:text-zinc-950 font-bold text-lg shrink-0 border border-zinc-200 dark:border-zinc-800">
              S
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg text-zinc-900 dark:text-zinc-50 truncate tracking-tight">
                SLP ERP System
              </span>
            )}
            <span className="font-bold text-lg text-zinc-900 dark:text-zinc-50 truncate tracking-tight md:hidden">
              SLP ERP System
            </span>
          </Link>

          {/* Close drawer on mobile */}
          {onMobileClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onMobileClose}
              className="md:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
          )}

          {/* Toggle Sidebar Button (Desktop Only) */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex absolute -right-3 top-7 w-6 h-6 rounded-full p-0 shadow-xs z-40"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const itemName = t.nav[item.key];

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onMobileClose}
                className="block relative"
              >
                <div
                  className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group cursor-pointer
                    ${
                      isActive
                        ? "bg-primary-light text-primary font-medium"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                    }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105
                        ${isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-305"}`}
                    />
                    {!sidebarCollapsed && (
                      <span className="text-sm truncate">{itemName}</span>
                    )}
                    <span className="text-sm truncate md:hidden">{itemName}</span>
                  </div>
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
      <div className="p-3 border-t border-sidebar-border space-y-3 bg-muted/20">
        {/* Environment Settings Controls */}
        {showExtra && process.env.NEXT_PUBLIC_ALLOW_DEMO_SANDBOX === "true" && (
          <div className="space-y-2.5 p-2.5 rounded-xl bg-card border border-border shadow-xs text-xs">
            {/* Mode switch */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium text-xs">{t.common.testMode}:</span>
              <Button
                variant={isMockMode ? "secondary" : "default"}
                size="xs"
                onClick={() => setMockMode(!isMockMode)}
                className="text-[10px] tracking-wider uppercase font-semibold h-6"
              >
                {isMockMode ? t.common.mockMode : t.common.apiClient}
              </Button>
            </div>

            {/* Role Switch */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium text-xs">{t.common.sessionRole}:</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={toggleRole}
                className="h-6 px-1.5 font-bold flex items-center gap-1 hover:text-primary"
              >
                <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                <Badge variant="outline" className="capitalize text-[10px] py-0">
                  {role}
                </Badge>
              </Button>
            </div>
          </div>
        )}

        {/* User Info & Settings Action */}
        <div className="flex items-center justify-between gap-2">
          {/* Theme & Language & Profile Details */}
          <div className="flex items-center gap-1.5 overflow-hidden">
            <LanguageToggle />
            <ThemeToggle />
            {showExtra && (
              <div className="flex flex-col overflow-hidden text-left pl-1">
                <span className="text-xs font-semibold truncate text-foreground">
                  {user?.email || "unknown@slp.id"}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {role}
                </span>
              </div>
            )}
          </div>

          {/* Logout Action */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
            className="rounded-xl text-muted-foreground hover:text-foreground shadow-xs shrink-0"
            title={t.common.logout}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
