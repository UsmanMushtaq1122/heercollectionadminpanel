"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = {
  default: "bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  outline:
    "border border-[#1A1A1A]/20 bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A]/5",
  secondary: "bg-[#E8DDD4] text-[#1A1A1A] hover:bg-[#E8DDD4]/80",
  ghost: "hover:bg-[#E8DDD4]/50",
  link: "text-[#C9A27E] underline-offset-4 hover:underline",
  gold: "bg-[#C9A27E] text-white hover:bg-[#C9A27E]/90",
};

const buttonSizes = {
  sm: "h-9 px-4 text-sm rounded-sm",
  default: "h-10 px-6 py-2 text-sm rounded-sm",
  lg: "h-12 px-8 text-base rounded-sm",
  xl: "h-14 px-10 text-lg rounded-sm",
  icon: "h-10 w-10 rounded-sm",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A27E]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };