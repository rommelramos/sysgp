import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)] border border-[var(--border)] rounded-[14px]",
        "shadow-[var(--shadow-card)] transition-all duration-200",
        "hover:shadow-[0_4px_20px_rgba(37,99,235,0.08)] hover:border-[var(--border-strong)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-b border-[var(--border)] flex items-center justify-between",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn("px-6 py-4 border-t border-[var(--border)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────────────── */

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "blue" | "teal" | "green" | "amber" | "purple";
  subtitle?: string;
  trend?: { value: number; label: string };
}

const colorMap = {
  blue:   { bg: "bg-blue-50",    text: "text-blue-600",   border: "border-blue-100",   hover: "hover:shadow-[0_4px_20px_rgba(37,99,235,0.1)]" },
  teal:   { bg: "bg-teal-50",    text: "text-teal-600",   border: "border-teal-100",   hover: "hover:shadow-[0_4px_20px_rgba(20,184,166,0.1)]" },
  green:  { bg: "bg-emerald-50", text: "text-emerald-600",border: "border-emerald-100",hover: "hover:shadow-[0_4px_20px_rgba(5,150,105,0.1)]" },
  amber:  { bg: "bg-amber-50",   text: "text-amber-600",  border: "border-amber-100",  hover: "hover:shadow-[0_4px_20px_rgba(217,119,6,0.1)]" },
  purple: { bg: "bg-violet-50",  text: "text-violet-600", border: "border-violet-100", hover: "hover:shadow-[0_4px_20px_rgba(124,58,237,0.1)]" },
};

export function StatCard({ title, value, icon, color = "blue", subtitle, trend }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)] border border-[var(--border)] rounded-[14px] p-5",
        "shadow-[var(--shadow-card)] transition-all duration-200",
        c.hover
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5" style={{ marginLeft: '5px' }}>
          <p className="text-[11px] font-semibold text-[var(--text-muted)] tracking-[0.07em] uppercase">
            {title}
          </p>
          <p className="text-[28px] font-bold text-[var(--text-primary)] leading-none tracking-tight font-[family-name:var(--font-display)]">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
          {trend && (
            <p className={cn("text-xs font-medium", trend.value >= 0 ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]")}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-[10px] border shrink-0", c.bg, c.border, c.text)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
