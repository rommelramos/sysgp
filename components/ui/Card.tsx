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
        "hover:shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:border-[var(--border-strong)]",
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
  blue:   { bg: "bg-[#4F8EF7]/10",  text: "text-[#4F8EF7]",  border: "border-[#4F8EF7]/20",  glow: "shadow-[0_0_24px_rgba(79,142,247,0.15)]" },
  teal:   { bg: "bg-[#2DD4BF]/10",  text: "text-[#2DD4BF]",  border: "border-[#2DD4BF]/20",  glow: "shadow-[0_0_24px_rgba(45,212,191,0.15)]" },
  green:  { bg: "bg-[#34D399]/10",  text: "text-[#34D399]",  border: "border-[#34D399]/20",  glow: "shadow-[0_0_24px_rgba(52,211,153,0.15)]" },
  amber:  { bg: "bg-[#FBBF24]/10",  text: "text-[#FBBF24]",  border: "border-[#FBBF24]/20",  glow: "shadow-[0_0_24px_rgba(251,191,36,0.15)]" },
  purple: { bg: "bg-[#A78BFA]/10",  text: "text-[#A78BFA]",  border: "border-[#A78BFA]/20",  glow: "shadow-[0_0_24px_rgba(167,139,250,0.15)]" },
};

export function StatCard({ title, value, icon, color = "blue", subtitle, trend }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)] border border-[var(--border)] rounded-[14px] p-5",
        "transition-all duration-200 hover:border-[var(--border-strong)]",
        "hover:" + c.glow,
        "relative overflow-hidden group"
      )}
    >
      {/* Subtle top-edge accent line */}
      <div className={cn("absolute top-0 left-0 right-0 h-px opacity-60", c.text.replace("text-", "bg-"))} />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-medium text-[var(--text-secondary)] tracking-wide uppercase leading-none">
            {title}
          </p>
          <p className="text-[28px] font-bold text-[var(--text-primary)] leading-none tracking-tight font-[family-name:var(--font-display)]">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
          {trend && (
            <p className={cn("text-xs font-medium", trend.value >= 0 ? "text-[#34D399]" : "text-[#F87171]")}>
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
