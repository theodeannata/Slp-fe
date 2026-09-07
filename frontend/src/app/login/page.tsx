"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Lock, Mail, AlertCircle, Shield, User } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setAuth, setMockMode } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t.login.credentialsRequired);
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

      if (data?.user && data.session) {
        let role: "admin" | "master" | "db_admin" | "pending" = "pending";
        try {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .single();
          if (roleData?.role) {
            role = roleData.role as "admin" | "master" | "db_admin" | "pending";
          }
        } catch {
          // role stays "pending" if lookup fails
        }
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
      {/* Top Language Switcher */}
      <div className="absolute top-6 right-6">
        <LanguageToggle showLabel />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        <Card className="shadow-sm">
          <CardHeader className="text-center pb-6">
            <div className="w-12 h-12 border border-border rounded-xl flex items-center justify-center mx-auto mb-2 bg-muted/30">
              <Lock className="w-5 h-5 text-foreground" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">
              {t.login.title}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.login.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold">
                  {t.login.emailLabel}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.login.emailPlaceholder}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold">
                  {t.login.passwordLabel}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.login.passwordPlaceholder}
                    className="pl-9"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2 font-semibold"
              >
                {loading ? t.login.signingIn : t.login.signInBtn}
              </Button>
            </form>

            {/* Demo Sandbox Gate */}
            {process.env.NEXT_PUBLIC_ALLOW_DEMO_SANDBOX === "true" && (
              <>
                <div className="relative my-6 flex items-center justify-center">
                  <Separator className="w-full" />
                  <span className="absolute px-3 bg-card text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    {t.login.demoAccess}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDemoLogin("admin")}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t.login.demoAdmin}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDemoLogin("master")}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t.login.demoMaster}</span>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
