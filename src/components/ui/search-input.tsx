"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (value: string) => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onChange, value: externalValue, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(
      externalValue || ""
    );
    const timerRef = React.useRef<ReturnType<typeof setTimeout>>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInternalValue(val);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange?.(val);
      }, 300);
    };

    const handleClear = () => {
      setInternalValue("");
      onChange?.("");
    };

    React.useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    return (
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]/40" />
        <input
          ref={ref}
          type="text"
          value={internalValue}
          onChange={handleChange}
          className={cn(
            "flex h-10 w-full rounded-sm border border-[#1A1A1A]/20 bg-white pl-10 pr-9 text-sm text-[#1A1A1A] transition-all duration-300 placeholder:text-[#1A1A1A]/40 focus:border-[#C9A27E] focus:outline-none focus:ring-2 focus:ring-[#C9A27E]/50",
            className
          )}
          {...props}
        />
        {internalValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";

export { SearchInput };