"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import {
  Users,
  Shield,
  User,
  ShieldAlert,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  user_roles: { role: "admin" | "master" } | null;
}

export default function UserManagement() {
  const router = useRouter();
  const { role } = useAppStore();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ status: "success" | "error" | null; message: string }>({
    status: null,
    message: "",
  });

  // Access Control check
  useEffect(() => {
    if (role !== "master") {
      router.push("/");
    }
  }, [role, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // 2. Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // 3. Join them in memory (bypasses any schema cache delay)
      const roleMap = new Map((rolesData || []).map((r: any) => [r.user_id, r.role]));
      const combined = (profilesData || []).map((p: any) => ({
        id: p.id,
        email: p.email,
        created_at: p.created_at,
        user_roles: roleMap.has(p.id) ? { role: roleMap.get(p.id) as "admin" | "master" } : null,
      }));

      setUsersList(combined);
    } catch (err: any) {
      setFeedback({
        status: "error",
        message: err.message || "Failed to load registered users.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: "admin" | "master" | null) => {
    setActionLoading(userId);
    setFeedback({ status: null, message: "" });
    try {
      if (newRole === null) {
        // Revoke role: delete row from user_roles
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;
        setFeedback({
          status: "success",
          message: "User privileges revoked successfully.",
        });
      } else {
        // Upsert role: insert or update
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: newRole });

        if (error) throw error;
        setFeedback({
          status: "success",
          message: `User promoted to ${newRole} role.`,
        });
      }
      // Re-fetch list
      await fetchUsers();
    } catch (err: any) {
      setFeedback({
        status: "error",
        message: err.message || "Failed to update user role.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (role !== "master") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            User Role Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Approve registered accounts and assign system permission levels.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-border-custom bg-card-bg hover:bg-slate-50 dark:hover:bg-zinc-900 text-foreground font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* Feedback Messages */}
      {feedback.status && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2 max-w-xl
            ${
              feedback.status === "success"
                ? "bg-zinc-100 dark:bg-zinc-950 text-foreground border-border-custom"
                : "bg-red-500/10 text-accent-red border-red-500/20"
            }`}
        >
          {feedback.status === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* User Profiles Table */}
      <div className="border border-border-custom bg-card-bg rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            <span className="text-xs">Loading registered users...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-450 uppercase tracking-wider font-semibold border-b border-border-custom bg-zinc-500/5 select-none">
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Sign Up Date</th>
                  <th className="py-3 px-4">Current Authorization</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom text-foreground">
                <AnimatePresence mode="popLayout">
                  {usersList.map((usr) => {
                    const activeRole = usr.user_roles?.role || "pending";
                    const isSelf = usr.email === useAppStore.getState().user?.email;

                    return (
                      <motion.tr
                        key={usr.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-500/5 group"
                      >
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[200px] sm:max-w-xs">{usr.email}</span>
                            {isSelf && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-primary-light border border-border-custom text-primary font-bold rounded-md">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(usr.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          {activeRole === "master" && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-accent-amber inline-flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              <span>Master Access</span>
                            </span>
                          )}
                          {activeRole === "admin" && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-accent-blue inline-flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>Admin Access</span>
                            </span>
                          )}
                          {activeRole === "pending" && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-400/10 border border-zinc-400/20 text-slate-400 inline-flex items-center gap-1 animate-pulse">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Pending Approval</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isSelf ? (
                            <span className="text-[10px] text-slate-400 italic">Self management restricted</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {actionLoading === usr.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                              ) : (
                                <>
                                  {activeRole !== "admin" && (
                                    <button
                                      onClick={() => handleUpdateRole(usr.id, "admin")}
                                      className="px-2 py-1 rounded-md border border-border-custom hover:border-blue-400 text-slate-650 hover:text-blue-500 bg-card-bg text-[10px] font-semibold transition-colors cursor-pointer"
                                      title="Approve as Admin"
                                    >
                                      Make Admin
                                    </button>
                                  )}
                                  {activeRole !== "master" && (
                                    <button
                                      onClick={() => handleUpdateRole(usr.id, "master")}
                                      className="px-2 py-1 rounded-md border border-border-custom hover:border-amber-400 text-slate-650 hover:text-amber-500 bg-card-bg text-[10px] font-semibold transition-colors cursor-pointer"
                                      title="Approve as Master"
                                    >
                                      Make Master
                                    </button>
                                  )}
                                  {activeRole !== "pending" && (
                                    <button
                                      onClick={() => handleUpdateRole(usr.id, null)}
                                      className="px-2 py-1 rounded-md border border-red-500/10 hover:border-red-500 text-slate-400 hover:text-red-500 bg-card-bg text-[10px] font-semibold transition-colors cursor-pointer"
                                      title="Revoke and set pending"
                                    >
                                      Revoke Access
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                  {usersList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-450 text-xs">
                        No registered profiles found in the database.
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Access Instructions Card */}
      <div className="p-4 rounded-xl border border-border-custom bg-slate-50 dark:bg-zinc-900/40 text-xs text-slate-500 dark:text-slate-400 space-y-1 max-w-xl">
        <p className="font-bold text-foreground flex items-center gap-1.5 mb-1.5">
          <UserCheck className="w-4 h-4 text-foreground" />
          <span>System Manager Controls</span>
        </p>
        <p>• <strong>Make Admin</strong>: Enables customer registry creation, product listing, and sales invoices. Purchases & matching ledger details remain locked.</p>
        <p>• <strong>Make Master</strong>: Full CRUD permissions, commission matching, data ingestion capabilities, and manager administration.</p>
        <p>• <strong>Revoke Access</strong>: Instantly removes database-level roles, blocking table reads/writes and presenting the "Pending Activation" state.</p>
      </div>
    </div>
  );
}
