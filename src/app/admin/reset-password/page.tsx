"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Lock, ArrowLeft } from "lucide-react";
import { resetPasswordSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ResetPasswordFormData = {
  password: string;
  confirmPassword: string;
};

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "#DC2626" };
  if (score <= 3) return { score, label: "Fair", color: "#C9A27E" };
  return { score, label: "Strong", color: "#2D7D46" };
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema) as any,
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password", "");
  const strength = useMemo(() => getPasswordStrength(passwordValue), [passwordValue]);
  const strengthPercent = useMemo(() => {
    if (!passwordValue) return 0;
    return (strength.score / 5) * 100;
  }, [passwordValue, strength.score]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F8F5F2" }}>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-2xl shadow-black/10" style={{ backgroundColor: "#FFFFFF" }}>
            <CardContent className="py-12 px-8 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: "#DC262615" }}
              >
                <AlertCircle className="w-7 h-7" style={{ color: "#DC2626" }} />
              </div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif", color: "#1A1A1A" }}
              >
                Invalid Link
              </h2>
              <p
                className="text-sm mb-6"
                style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#1A1A1A80" }}
              >
                This password reset link is invalid or missing a token. Please request a new one.
              </p>
              <Link
                href="/admin/forgot-password"
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 hover:underline"
                style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#C9A27E" }}
              >
                Request New Reset Link
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err: any) {
      const message = err?.message || "Something went wrong";
      if (message.includes("expired") || message.includes("invalid token")) {
        setError("This reset link has expired or is invalid. Please request a new one.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F8F5F2" }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl shadow-black/10" style={{ backgroundColor: "#FFFFFF" }}>
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#C9A27E15" }}
              >
                <Lock className="w-6 h-6" style={{ color: "#C9A27E" }} />
              </div>
              <h1
                className="text-3xl font-bold tracking-tight mb-1"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif", color: "#1A1A1A" }}
              >
                Create New Password
              </h1>
              <div className="w-12 h-0.5 mx-auto my-3" style={{ backgroundColor: "#C9A27E" }} />
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#1A1A1A80" }}
              >
                Your new password must be at least 8 characters and include uppercase, lowercase, and a number.
              </p>
            </motion.div>
          </CardHeader>

          <CardContent className="pt-6 pb-8 px-8">
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: "#2D7D4615" }}
                >
                  <CheckCircle className="w-8 h-8" style={{ color: "#2D7D46" }} />
                </div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif", color: "#1A1A1A" }}
                >
                  Password Reset Successful
                </h3>
                <p
                  className="text-sm mb-6"
                  style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#1A1A1A80" }}
                >
                  Your password has been updated. You can now sign in with your new password.
                </p>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center justify-center h-12 px-8 text-sm font-semibold uppercase tracking-widest rounded-sm transition-all duration-300 hover:shadow-lg"
                  style={{
                    fontFamily: "'Geist', 'Segoe UI', sans-serif",
                    backgroundColor: "#C9A27E",
                    color: "#FFFFFF",
                  }}
                >
                  Sign In
                </Link>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 p-3.5 rounded-sm mb-6"
                style={{
                  backgroundColor: "#DC262610",
                  border: "1px solid #DC262625",
                }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#DC2626" }} />
                <div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#DC2626" }}
                  >
                    {error}
                  </p>
                  {error.includes("expired") && (
                    <Link
                      href="/admin/forgot-password"
                      className="text-xs font-medium mt-1.5 inline-block underline transition-colors duration-200"
                      style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#C9A27E" }}
                    >
                      Request a new reset link
                    </Link>
                  )}
                </div>
              </motion.div>
            )}

            {!success && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#1A1A1A" }}
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      disabled={isLoading}
                      className="h-12 px-4 pr-12 text-sm rounded-sm border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-0"
                      style={{
                        fontFamily: "'Geist', 'Segoe UI', sans-serif",
                        borderColor: errors.password ? "#DC2626" : "#1A1A1A33",
                        backgroundColor: "#FAFAF8",
                      }}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-sm transition-colors duration-200"
                      style={{ color: "#1A1A1A80" }}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs mt-1" style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#DC2626" }}>
                      {errors.password.message}
                    </p>
                  )}

                  {passwordValue && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-2"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-xs font-medium"
                          style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#1A1A1A80" }}
                        >
                          Password strength
                        </span>
                        <span
                          className="text-xs font-semibold"
                          style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: strength.color }}
                        >
                          {strength.label}
                        </span>
                      </div>
                      <div
                        className="w-full h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: "#1A1A1A33" }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${strengthPercent}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          style={{ backgroundColor: strength.color }}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#1A1A1A" }}
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      disabled={isLoading}
                      className="h-12 px-4 pr-12 text-sm rounded-sm border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-0"
                      style={{
                        fontFamily: "'Geist', 'Segoe UI', sans-serif",
                        borderColor: errors.confirmPassword ? "#DC2626" : "#1A1A1A33",
                        backgroundColor: "#FAFAF8",
                      }}
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-sm transition-colors duration-200"
                      style={{ color: "#1A1A1A80" }}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs mt-1" style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#DC2626" }}>
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 text-sm font-semibold uppercase tracking-widest rounded-sm transition-all duration-300 hover:shadow-lg"
                  style={{
                    fontFamily: "'Geist', 'Segoe UI', sans-serif",
                    backgroundColor: "#C9A27E",
                    color: "#FFFFFF",
                  }}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resetting...
                    </span>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 hover:underline"
                style={{ fontFamily: "'Geist', 'Segoe UI', sans-serif", color: "#C9A27E" }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
