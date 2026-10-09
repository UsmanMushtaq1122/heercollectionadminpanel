"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { forgotPasswordSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ForgotPasswordFormData = {
  email: string;
};

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Failed to send reset link");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F5F2]">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl shadow-black/10 bg-white">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold tracking-tight mb-1 font-serif text-[#1A1A1A]">
                Reset Your Password
              </h1>
              <div className="w-12 h-0.5 mx-auto my-3 bg-[#C9A27E]" />
              <p className="text-sm leading-relaxed text-[#1A1A1A]/60">
                Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
              </p>
            </motion.div>
          </CardHeader>

          <CardContent className="pt-6 pb-8 px-8">
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 p-4 rounded-sm mb-6 bg-[#C9A27E]/10 border border-[#C9A27E]/30"
              >
                <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    Password reset link sent to your email
                  </p>
                  <p className="text-xs mt-1 text-emerald-700/80">
                    Please check your inbox and follow the instructions.
                  </p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 p-3.5 rounded-sm mb-6 bg-red-500/10 border border-red-500/20"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm leading-relaxed text-red-600">
                    {error}
                  </p>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs font-medium mt-1.5 underline text-[#C9A27E] hover:text-[#B8906A] transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </motion.div>
            )}

            {!success && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]"
                  >
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@heercollection.com"
                    disabled={isLoading}
                    className={cn(
                      "h-12 px-4 text-sm rounded-sm border bg-[#FAFAF8] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-0",
                      errors.email ? "border-red-600" : "border-[#1A1A1A]/20"
                    )}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs mt-1 text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 text-sm font-semibold uppercase tracking-widest rounded-sm bg-[#C9A27E] text-white hover:bg-[#B8906A] transition-all duration-300 hover:shadow-lg"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C9A27E] hover:text-[#B8906A] transition-colors duration-200 hover:underline"
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
