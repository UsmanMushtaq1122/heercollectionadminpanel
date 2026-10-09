"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { loginSchema } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LoginFormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// LoginForm — inner component so useSearchParams() works inside <Suspense>
// ─────────────────────────────────────────────────────────────────────────────
function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  // isLoading: true while reading localStorage (set in authSlice initial state)
  // isAuthenticated: true once a valid session is found/set
  const { login, isAuthenticated, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  // ── Auto-redirect when session is confirmed ──────────────────────────────
  // Only fires AFTER isLoading=false so we never redirect prematurely.
  // The re-synced cookie (done in useAuth) means the proxy will allow it.
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirect);
    }
  }, [isLoading, isAuthenticated, redirect, router]);

  // ── Form submit ───────────────────────────────────────────────────────────
  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLocked(false);
    setIsSubmitting(true);

    try {
      await login(data.email, data.password);
      // Redirect handled by the useEffect above once isAuthenticated → true
    } catch (err: any) {
      const message = err?.message || "An unexpected error occurred";
      if (message.includes("rate limit") || message.includes("too many")) {
        setError("Too many login attempts. Please wait a moment and try again.");
        setIsLocked(true);
      } else if (message.includes("locked") || message.includes("account locked")) {
        setError("Your account has been locked due to multiple failed attempts. Please contact support.");
        setIsLocked(true);
      } else if (message.includes("Invalid") || message.includes("invalid") || message.includes("credentials")) {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (message.includes("not found") || message.includes("does not exist")) {
        setError("No account found with this email address.");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render guards ─────────────────────────────────────────────────────────

  // State 1: Auth still being loaded from localStorage — tiny spinner,
  // do NOT show the form yet (avoids a flash before we know auth state).
  if (!isHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A27E] border-t-transparent" />
      </div>
    );
  }

  // State 2: Hydration done, user IS authenticated — redirect in progress.
  if (isAuthenticated) {
    return (
      <Card className="border-0 shadow-2xl shadow-black/10 bg-white p-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A27E]" />
          <p className="text-sm text-[#1A1A1A]/70">Redirecting to admin dashboard...</p>
        </div>
      </Card>
    );
  }

  // State 3: Not authenticated — show the login form.
  const busy = isSubmitting || isLocked;

  return (
    <Card className="border-0 shadow-2xl shadow-black/10 bg-white">
      <CardHeader className="text-center pb-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold tracking-tight mb-1 font-serif text-[#1A1A1A]">
            Heer Collection
          </h1>
          <div className="w-12 h-0.5 mx-auto my-3 bg-[#C9A27E]" />
          <p className="text-sm font-medium tracking-widest uppercase text-[#C9A27E]">
            Admin Dashboard
          </p>
        </motion.div>
      </CardHeader>

      <CardContent className="pt-6 pb-8 px-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 p-3.5 rounded-sm mb-6 bg-red-500/10 border border-red-500/20"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
            <p className="text-sm leading-relaxed text-red-600">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="admin@heercollection.com"
              disabled={busy}
              className={cn(
                "h-12 px-4 text-sm rounded-sm border bg-[#FAFAF8] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-0",
                errors.email ? "border-red-600" : "border-[#1A1A1A]/20"
              )}
              {...register("email")}
            />
            {errors.email && <p className="text-xs mt-1 text-red-600">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                disabled={busy}
                className={cn(
                  "h-12 px-4 pr-12 text-sm rounded-sm border bg-[#FAFAF8] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-0",
                  errors.password ? "border-red-600" : "border-[#1A1A1A]/20"
                )}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={busy}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-sm text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors duration-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs mt-1 text-red-600">{errors.password.message}</p>}
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={busy}
                className="w-4 h-4 rounded border-[#1A1A1A]/20 accent-[#C9A27E] cursor-pointer"
                {...register("rememberMe")}
              />
              <span className="text-sm text-[#1A1A1A]">Remember Me</span>
            </label>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-12 text-sm font-semibold uppercase tracking-widest rounded-sm bg-[#C9A27E] text-white hover:bg-[#B8906A] transition-all duration-300 hover:shadow-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing In...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/admin/forgot-password"
            className="text-sm font-medium text-[#C9A27E] transition-colors duration-200 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page shell — Suspense required for useSearchParams() inside LoginForm
// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F5F2]">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A27E] border-t-transparent" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
