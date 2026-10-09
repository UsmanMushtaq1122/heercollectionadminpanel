"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getOrderStatusColor, getOrderStatusLabel, getPaymentStatusColor } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type: "order" | "payment";
  className?: string;
}

function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const colorClass =
    type === "order"
      ? getOrderStatusColor(status)
      : getPaymentStatusColor(status);
  const label =
    type === "order"
      ? getOrderStatusLabel(status)
      : status
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-transparent px-2.5 py-0.5 text-xs font-semibold",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}

export { StatusBadge };