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
  UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Modal } from "@/components/Modal";

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  user_roles: { role: "admin" | "master" | "db_admin" } | null;
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

  // User creation states
  const [modalOpen, setModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "master" | "db_admin">("admin");
  const [submitLoading, setSubmitLoading] = useState(false);

  // User password reset states
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetUserEmail, setResetUserEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;

    setSubmitLoading(true);
    setFeedback({ status: null, message: "" });
    try {
      await api.users.create({
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      setFeedback({
        status: "success",
        message: `Account created successfully for ${newEmail} (${newRole}).`,
      });
      setModalOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
      await fetchUsers();
    } catch (err: any) {
      setFeedback({
        status: "error",
        message: err.message || "Failed to create user.",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user account?")) return;
    setActionLoading(userId);
    setFeedback({ status: null, message: "" });
    try {
      await api.users.delete(userId);
      setFeedback({
        status: "success",
        message: "User account deleted permanently.",
      });
      await fetchUsers();
    } catch (err: any) {
      setFeedback({
        status: "error",
        message: err.message || "Failed to delete user account.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !resetPassword) return;

    setResetLoading(true);
    setFeedback({ status: null, message: "" });
    try {
      await api.users.changePassword(resetUserId, resetPassword);
      setFeedback({
        status: "success",
        message: `Password updated successfully for ${resetUserEmail}.`,
      });
      setResetModalOpen(false);
      setResetPassword("");
    } catch (err: any) {
      setFeedback({
        status: "error",
        message: err.message || "Failed to update user password.",
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Access Control check
  useEffect(() => {
    if (role !== "db_admin") {
      router.push("/");
    }
  }, [role, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch users directly from user_roles
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, email, role, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map to the UserProfile structure
      const formatted = (data || []).map((u: any) => ({
        id: u.user_id,
        email: u.email || "unknown@slp.id",
        created_at: u.created_at,
        user_roles: { role: u.role as "admin" | "master" | "db_admin" },
      }));

      setUsersList(formatted);
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

  const handleUpdateRole = async (userId: string, newRole: "admin" | "master" | "db_admin" | null) => {
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

  if (role !== "db_admin") {
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
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-border-custom bg-card-bg hover:bg-slate-50 dark:hover:bg-zinc-900 text-foreground font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Users</span>
          </button>
        </div>
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
                          {activeRole === "db_admin" && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-600 inline-flex items-center gap-1">
                              <Shield className="w-3 h-3 text-purple-550" />
                              <span>DB Admin Access</span>
                            </span>
                          )}
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
                                  {activeRole !== "db_admin" && (
                                    <button
                                      onClick={() => handleUpdateRole(usr.id, "db_admin")}
                                      className="px-2 py-1 rounded-md border border-border-custom hover:border-purple-400 text-slate-650 hover:text-purple-500 bg-card-bg text-[10px] font-semibold transition-colors cursor-pointer"
                                      title="Approve as DB Admin"
                                    >
                                      Make DB Admin
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
                                  <button
                                    onClick={() => {
                                      setResetUserId(usr.id);
                                      setResetUserEmail(usr.email);
                                      setResetPassword("");
                                      setResetModalOpen(true);
                                    }}
                                    className="px-2 py-1 rounded-md border border-border-custom hover:border-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-650 dark:text-slate-300 bg-card-bg text-[10px] font-semibold transition-colors cursor-pointer"
                                    title="Change Password"
                                  >
                                    Password
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(usr.id)}
                                    className="p-1 rounded-md border border-red-500/10 hover:border-red-500 text-slate-400 hover:text-red-500 bg-card-bg transition-colors cursor-pointer"
                                    title="Delete User Permanently"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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
        <p>• <strong>Make Master</strong>: Full CRUD permissions, PO matching, data ingestion capabilities, and manager administration.</p>
        <p>• <strong>Make DB Admin</strong>: Highest role. Manage roles for other accounts.</p>
        <p>• <strong>Revoke Access</strong>: Instantly removes database-level roles, blocking table reads/writes and presenting the "Pending Activation" state.</p>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Account" maxWidth="max-w-md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Email Address</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">System Permission Role</label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer text-center transition-all
                  ${
                    newRole === "admin"
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border-custom bg-card-bg hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-500"
                  }`}
              >
                <input
                  type="radio"
                  name="newRole"
                  value="admin"
                  checked={newRole === "admin"}
                  onChange={() => setNewRole("admin")}
                  className="sr-only"
                />
                <span className="font-bold text-[10px] text-foreground">Admin</span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer text-center transition-all
                  ${
                    newRole === "master"
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border-custom bg-card-bg hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-500"
                  }`}
              >
                <input
                  type="radio"
                  name="newRole"
                  value="master"
                  checked={newRole === "master"}
                  onChange={() => setNewRole("master")}
                  className="sr-only"
                />
                <span className="font-bold text-[10px] text-foreground">Master</span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer text-center transition-all
                  ${
                    newRole === "db_admin"
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border-custom bg-card-bg hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-500"
                  }`}
              >
                <input
                  type="radio"
                  name="newRole"
                  value="db_admin"
                  checked={newRole === "db_admin"}
                  onChange={() => setNewRole("db_admin")}
                  className="sr-only"
                />
                <span className="font-bold text-[10px] text-foreground">DB Admin</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3.5 py-2 rounded-xl border border-border-custom bg-card-bg hover:bg-slate-50 dark:hover:bg-zinc-900 text-foreground font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {submitLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Create Account</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title={`Change Password for ${resetUserEmail}`} maxWidth="max-w-md">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">New Password</label>
            <input
              type="password"
              required
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 border border-border-custom rounded-xl bg-card-bg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-3.5 py-2 rounded-xl border border-border-custom bg-card-bg hover:bg-slate-50 dark:hover:bg-zinc-900 text-foreground font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetLoading}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-background font-semibold text-xs cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {resetLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
