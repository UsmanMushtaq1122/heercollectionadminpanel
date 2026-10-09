"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  onValueChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, placeholder, children, id, onValueChange, onChange, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };
    const items: React.ReactNode[] = [];
    let selectClassName = className;
    React.Children.forEach(children, (child) => {
      if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)) {
        if (child.type === SelectTrigger) {
          selectClassName = cn(selectClassName, child.props.className);
          return;
        }
        if (child.type === SelectContent) {
          items.push(child.props.children);
          return;
        }
      }
      items.push(child);
    });
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-[#1A1A1A]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            className={cn(
              "flex h-10 w-full appearance-none rounded-sm border border-[#1A1A1A]/20 bg-white px-3 py-2 pr-10 text-sm text-[#1A1A1A] transition-all duration-300 focus:border-[#C9A27E] focus:outline-none focus:ring-2 focus:ring-[#C9A27E]/50 disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-400 focus:border-red-400 focus:ring-red-400/30",
              selectClassName
            )}
            ref={ref}
            onChange={handleChange}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-white text-[#1A1A1A]">
                {placeholder}
              </option>
            )}
            {React.Children.map(items, (child) => {
              if (React.isValidElement<{ className?: string }>(child)) {
                return React.cloneElement(child, {
                  className: cn("bg-white text-[#1A1A1A]", child.props.className),
                });
              }
              return child;
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/40" />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

const SelectTrigger = Select;

const SelectValue = ({ placeholder }: { placeholder?: string }) => null;

function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <>{children}</>;
}

function SelectItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  return <option value={value}>{children}</option>;
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };