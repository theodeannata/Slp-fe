"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import { useTranslation } from "@/lib/i18n";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table as ShadcnTable,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  user_roles: { role: "admin" | "master" | "db_admin" } | null;
}

export default function UserManagement() {
  const router = useRouter();
  const { t } = useTranslation();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t.users.title}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            {t.users.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            onClick={() => setModalOpen(true)}
            size="sm"
            className="gap-1.5 font-semibold text-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t.common.add} {t.common.role}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="gap-1.5 font-semibold text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{t.common.refresh}</span>
          </Button>
        </div>
      </div>

      {/* Feedback Messages */}
      {feedback.status && (
        <Alert
          variant={feedback.status === "error" ? "destructive" : "default"}
          className="max-w-xl py-2.5"
        >
          {feedback.status === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <ShieldAlert className="w-4 h-4" />
          )}
          <AlertDescription className="text-xs">{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* User Profiles Table */}
      <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            <span className="text-xs">{t.common.loading}</span>
          </div>
        ) : (
          <ShadcnTable>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="h-10 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.users.userEmail}</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.users.lastSignIn}</TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.users.assignedRole}</TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.users.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {usersList.map((usr) => {
                  const activeRole = usr.user_roles?.role || "pending";
                  const isSelf = usr.email === useAppStore.getState().user?.email;

                  return (
                    <TableRow key={usr.id}>
                      <TableCell className="py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px] sm:max-w-xs">{usr.email}</span>
                          {isSelf && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground text-xs">
                        {new Date(usr.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {activeRole === "db_admin" && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400 gap-1">
                            <Shield className="w-3 h-3" />
                            <span>DB Admin Access</span>
                          </Badge>
                        )}
                        {activeRole === "master" && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 gap-1">
                            <Shield className="w-3 h-3" />
                            <span>Master Access</span>
                          </Badge>
                        )}
                        {activeRole === "admin" && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 gap-1">
                            <User className="w-3 h-3" />
                            <span>Admin Access</span>
                          </Badge>
                        )}
                        {activeRole === "pending" && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-muted text-muted-foreground gap-1 animate-pulse">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Pending Approval</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        {isSelf ? (
                          <span className="text-[10px] text-muted-foreground italic">Self management restricted</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {actionLoading === usr.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <>
                                {activeRole !== "admin" && (
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => handleUpdateRole(usr.id, "admin")}
                                    className="text-[10px] h-6 hover:text-blue-500"
                                    title="Approve as Admin"
                                  >
                                    Make Admin
                                  </Button>
                                )}
                                {activeRole !== "master" && (
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => handleUpdateRole(usr.id, "master")}
                                    className="text-[10px] h-6 hover:text-amber-500"
                                    title="Approve as Master"
                                  >
                                    Make Master
                                  </Button>
                                )}
                                {activeRole !== "db_admin" && (
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => handleUpdateRole(usr.id, "db_admin")}
                                    className="text-[10px] h-6 hover:text-purple-500"
                                    title="Approve as DB Admin"
                                  >
                                    Make DB Admin
                                  </Button>
                                )}
                                {activeRole !== "pending" && (
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => handleUpdateRole(usr.id, null)}
                                    className="text-[10px] h-6 text-destructive hover:bg-destructive/10"
                                    title="Revoke and set pending"
                                  >
                                    Revoke
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => {
                                    setResetUserId(usr.id);
                                    setResetUserEmail(usr.email);
                                    setResetPassword("");
                                    setResetModalOpen(true);
                                  }}
                                  className="text-[10px] h-6"
                                  title="Change Password"
                                >
                                  Password
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon-xs"
                                  onClick={() => handleDeleteUser(usr.id)}
                                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                  title="Delete User Permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {usersList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground text-xs">
                      No registered profiles found in the database.
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </ShadcnTable>
        )}
      </div>

      {/* Access Instructions Card */}
      <Card className="max-w-xl bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1.5">
          <p className="font-bold text-foreground flex items-center gap-1.5 mb-1.5">
            <UserCheck className="w-4 h-4 text-foreground" />
            <span>System Manager Controls</span>
          </p>
          <p>• <strong>Make Admin</strong>: Enables customer registry creation, product listing, and sales invoices. Purchases & matching ledger details remain locked.</p>
          <p>• <strong>Make Master</strong>: Full CRUD permissions, PO matching, data ingestion capabilities, and manager administration.</p>
          <p>• <strong>Make DB Admin</strong>: Highest role. Manage roles for other accounts.</p>
          <p>• <strong>Revoke Access</strong>: Instantly removes database-level roles, blocking table reads/writes and presenting the "Pending Activation" state.</p>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Account" maxWidth="sm:max-w-md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Email Address</Label>
            <Input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Password</Label>
            <Input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground block">System Permission Role</Label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer text-center transition-all
                  ${
                    newRole === "admin"
                      ? "border-primary bg-muted text-primary"
                      : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
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
                      ? "border-primary bg-muted text-primary"
                      : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
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
                      ? "border-primary bg-muted text-primary"
                      : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
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

          <div className="pt-2 flex justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitLoading}
              className="gap-1"
            >
              {submitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Account</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title={`Change Password for ${resetUserEmail}`} maxWidth="sm:max-w-md">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">New Password</Label>
            <Input
              type="password"
              required
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={resetLoading}
              className="gap-1"
            >
              {resetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Update Password</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
