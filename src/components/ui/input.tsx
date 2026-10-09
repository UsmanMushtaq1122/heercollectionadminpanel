"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[#1A1A1A]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40">
              {icon}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              "flex h-10 w-full rounded-sm border border-[#1A1A1A]/20 bg-white px-3 py-2 text-sm text-[#1A1A1A] transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#1A1A1A]/40 focus:border-[#C9A27E] focus:outline-none focus:ring-2 focus:ring-[#C9A27E]/50 disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-10",
              error && "border-red-400 focus:border-red-400 focus:ring-red-400/30",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };