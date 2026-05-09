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
      "inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed select-none font-[family-name:var(--font-display)] tracking-tight";

    const variants = {
      primary:
        "bg-gradient-to-b from-[#5B9BFF] to-[#2563EB] text-white shadow-[0_2px_12px_rgba(79,142,247,0.35)] hover:shadow-[0_4px_20px_rgba(79,142,247,0.45)] hover:-translate-y-px active:translate-y-0 active:shadow-[0_1px_6px_rgba(79,142,247,0.25)]",
      secondary:
        "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]",
      danger:
        "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/18 hover:border-red-400/30",
      ghost:
        "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
      outline:
        "border border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10",
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
