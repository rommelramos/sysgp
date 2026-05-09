import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl",
        "transition-shadow duration-150 hover:shadow-[0_0_20px_rgba(37,99,235,0.12)]",
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
    <div className={cn("px-6 py-4 border-b border-[var(--border)]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("px-6 py-4 border-t border-[var(--border)]", className)} {...props}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "blue" | "cyan" | "green" | "amber";
  subtitle?: string;
}

const colorMap = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
};

export function StatCard({ title, value, icon, color = "blue", subtitle }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
          {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</p>}
        </div>
        <div className={cn("p-3 rounded-xl border", colors.bg, colors.border, colors.text)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
