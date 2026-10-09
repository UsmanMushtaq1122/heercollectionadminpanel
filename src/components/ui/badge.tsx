"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80",
  secondary: "bg-[#E8DDD4] text-[#1A1A1A] hover:bg-[#E8DDD4]/80",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  outline: "border-[#1A1A1A]/20 text-[#1A1A1A]",
  gold: "bg-[#C9A27E] text-white hover:bg-[#C9A27E]/80",
  new: "bg-emerald-500 text-white hover:bg-emerald-600",
  sale: "bg-red-500 text-white hover:bg-red-600",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A27E]/50 focus:ring-offset-2",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };