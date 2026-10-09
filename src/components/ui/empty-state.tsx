"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  dark?: boolean;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  dark = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center rounded-sm",
        dark ? "bg-[#1A1A1A] text-[#F8F5F2]" : "",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full transition-transform duration-300",
            dark
              ? "bg-[#F8F5F2]/5 border border-[#F8F5F2]/10 text-[#C9A27E]"
              : "bg-[#E8DDD4] text-[#C9A27E]"
          )}
        >
          {icon}
        </div>
      )}
      <h3
        className={cn(
          "mt-6 text-lg font-light tracking-wide md:text-xl",
          dark ? "text-[#F8F5F2]" : "text-[#1A1A1A]"
        )}
      >
        {title}
      </h3>
      <div className="mt-3 h-px w-12 bg-[#C9A27E]" />
      {description && (
        <p
          className={cn(
            "mt-4 max-w-md text-sm leading-relaxed",
            dark ? "text-[#F8F5F2]/60" : "text-[#1A1A1A]/60"
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="gold"
          onClick={action.onClick}
          className="mt-8 text-xs font-medium uppercase tracking-widest bg-[#C9A27E] text-[#1A1A1A] hover:bg-[#C9A27E]/90"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export { EmptyState };