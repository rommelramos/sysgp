"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed select-none font-[family-name:var(--font-display)] tracking-tight";

    const variants = {
      primary:
        "bg-[var(--accent-primary)] text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:bg-[#1D4ED8] hover:shadow-[0_4px_16px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0",
      secondary:
        "bg-white text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]",
      danger:
        "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300",
      ghost:
        "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
      outline:
        "border border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-blue-50",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2.5",
      lg: "text-sm px-6 py-3",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
