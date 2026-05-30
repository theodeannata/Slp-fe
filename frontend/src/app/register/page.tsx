"use client";

import { useState } from "react";
import { useRouter, notFound } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Lock, Mail, AlertCircle, Shield, User, CheckCircle, UserPlus, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Register() {
  if (process.env.NEXT_PUBLIC_ALLOW_REGISTRATION !== "true") {
    notFound();
  }

  const router = useRouter();
  const { setAuth, setMockMode } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [role, setRole] = useState<"admin" | "master">("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    const registrationSecret = process.env.NEXT_PUBLIC_REGISTRATION_SECRET || "slp-secret-key-2026";
    if (secretKey !== registrationSecret) {
      setError("Incorrect Registration Secret Key. Sign up denied.");
      return;
    }

    setLoading(true);

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured. Please use Demo Sandbox below.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
          },
        },
      });

      if (authError) throw authError;

      if (data?.user) {
        setSuccess("Registration successful! You can now log in.");
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRegister = (selectedRole: "admin" | "master") => {
    setMockMode(true);
    setAuth(
      { email: `new-${selectedRole}@slp.id`, id: `mock-user-${Math.floor(Math.random() * 10000)}` },
      selectedRole,
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
        <div className="text-center mb-6">
          <div className="w-12 h-12 border border-border-custom rounded-xl flex items-center justify-center mx-auto mb-4 bg-slate-50 dark:bg-zinc-900">
            <UserPlus className="w-5 h-5 text-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Create ERP Account
          </h1>
          <p className="text-slate-450 dark:text-slate-400 mt-1 text-xs">
            Sign up to access invoices, stock management, and purchases.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
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
                placeholder="Minimum 6 characters"
                className="w-full pl-9 pr-4 py-2 border border-border-custom rounded-xl bg-card-bg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Confirm Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full pl-9 pr-4 py-2 border border-border-custom rounded-xl bg-card-bg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Registration Secret Key
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter secret registration key"
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

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">
              Default System Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex flex-col gap-1 p-3 border rounded-xl cursor-pointer text-left transition-all
                  ${
                    role === "admin"
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border-custom bg-card-bg hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-500"
                  }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === "admin"}
                  onChange={() => setRole("admin")}
                  className="sr-only"
                />
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-foreground">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>Admin Role</span>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 leading-normal">
                  Standard invoicing, products, and customer directories. purchases & matching engine locked.
                </span>
              </label>

              <label
                className={`flex flex-col gap-1 p-3 border rounded-xl cursor-pointer text-left transition-all
                  ${
                    role === "master"
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border-custom bg-card-bg hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-500"
                  }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="master"
                  checked={role === "master"}
                  onChange={() => setRole("master")}
                  className="sr-only"
                />
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-foreground">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>Master Role</span>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 leading-normal">
                  Full CRUD, PO matching ledger, background Excel ingestion, and user role management.
                </span>
              </label>
            </div>
          </div>

          {success && (
            <div className="bg-emerald-500/10 text-accent-green border border-emerald-500/20 px-3 py-2 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        {/* Existing account link */}
        <div className="text-center mt-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>

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
            onClick={() => handleDemoRegister("admin")}
            className="py-2 px-3 border border-border-custom hover:bg-slate-50 dark:hover:bg-zinc-900 text-foreground rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Admin Demo</span>
          </button>
          <button
            onClick={() => handleDemoRegister("master")}
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
