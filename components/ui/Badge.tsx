import { cn } from "@/lib/utils";

const variants = {
  ativo: "bg-emerald-500/15 text-emerald-400",
  encerrado: "bg-slate-500/15 text-slate-400",
  suspenso: "bg-amber-500/15 text-amber-400",
  em_andamento: "bg-blue-500/15 text-blue-400",
  concluido: "bg-emerald-500/15 text-emerald-400",
  membro: "bg-slate-500/15 text-slate-400",
  supervisor: "bg-cyan-500/15 text-cyan-400",
  administrador: "bg-purple-500/15 text-purple-400",
  bolsista: "bg-emerald-500/15 text-emerald-400",
  info: "bg-blue-500/15 text-blue-400",
  warning: "bg-amber-500/15 text-amber-400",
  danger: "bg-red-500/15 text-red-400",
};

const labels: Record<string, string> = {
  ATIVO: "Ativo",
  ENCERRADO: "Encerrado",
  SUSPENSO: "Suspenso",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDO: "Concluído",
  MEMBRO: "Membro",
  SUPERVISOR: "Supervisor",
  ADMINISTRADOR: "Administrador",
};

interface BadgeProps {
  value: string;
  className?: string;
}

export function Badge({ value, className }: BadgeProps) {
  const key = value.toLowerCase().replace(/_/g, "_") as keyof typeof variants;
  const variantClass = variants[key] || variants.info;
  const label = labels[value] || value;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantClass,
        className
      )}
    >
      {label}
    </span>
  );
}
