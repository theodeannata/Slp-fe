"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Lock, Mail, AlertCircle, Shield, User } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const { setAuth, setMockMode } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your credentials.");
      return;
    }

    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured. Please use Demo Mode below.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data?.user) {
        const role = (data.user.user_metadata?.role || "admin") as "admin" | "master";
        setAuth(
          { email: data.user.email || email, id: data.user.id },
          role,
          data.session
        );
        setMockMode(false);
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: "admin" | "master") => {
    setMockMode(true);
    setAuth(
      { email: `${role}@slp.id`, id: `mock-${role}-uid` },
      role,
      { access_token: "mock-jwt-token" }
    );
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative font-sans">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full border border-border-custom bg-card-bg p-8 sm:p-10 rounded-2xl shadow-sm relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 border border-border-custom rounded-xl flex items-center justify-center mx-auto mb-4 bg-slate-50 dark:bg-zinc-900">
            <Lock className="w-5 h-5 text-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            SLP ERP System
          </h1>
          <p className="text-slate-450 dark:text-slate-400 mt-1 text-xs">
            Sign in to access invoices, stock management, and purchases.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-9 pr-4 py-2 border border-border-custom rounded-xl bg-card-bg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2 border border-border-custom rounded-xl bg-card-bg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 text-accent-red border border-red-500/20 px-3 py-2 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>



        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-custom" />
          </div>
          <span className="relative z-10 px-3 bg-white dark:bg-zinc-950 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Demo Sandbox
          </span>
        </div>

        {/* Demo buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDemoLogin("admin")}
            className="py-2 px-3 border border-border-custom hover:bg-slate-50 dark:hover:bg-zinc-900 text-foreground rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Admin Demo</span>
          </button>
          <button
            onClick={() => handleDemoLogin("master")}
            className="py-2 px-3 border border-border-custom hover:bg-slate-50 dark:hover:bg-zinc-900 text-foreground rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Master Demo</span>
          </button>
        </div>
      </motion.div>
    </main>
  );
}
