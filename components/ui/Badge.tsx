import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  ativo:        "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  encerrado:    "bg-slate-400/10   text-slate-400   border-slate-400/20",
  suspenso:     "bg-amber-400/10   text-amber-400   border-amber-400/20",
  em_andamento: "bg-blue-400/10    text-blue-400    border-blue-400/20",
  concluido:    "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  membro:       "bg-slate-400/10   text-slate-400   border-slate-400/20",
  supervisor:   "bg-teal-400/10    text-teal-400    border-teal-400/20",
  administrador:"bg-violet-400/10  text-violet-400  border-violet-400/20",
  bolsista:     "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  info:         "bg-blue-400/10    text-blue-400    border-blue-400/20",
  warning:      "bg-amber-400/10   text-amber-400   border-amber-400/20",
  danger:       "bg-red-400/10     text-red-400     border-red-400/20",
};

const labels: Record<string, string> = {
  ATIVO:        "Ativo",
  ENCERRADO:    "Encerrado",
  SUSPENSO:     "Suspenso",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDO:    "Concluído",
  MEMBRO:       "Membro",
  SUPERVISOR:   "Supervisor",
  ADMINISTRADOR:"Administrador",
};

interface BadgeProps {
  value: string;
  className?: string;
}

export function Badge({ value, className }: BadgeProps) {
  const key = value.toLowerCase().replace(/ /g, "_");
  const variantClass = variants[key] ?? variants.info;
  const label = labels[value] ?? value;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide",
        variantClass,
        className
      )}
    >
      {label}
    </span>
  );
}
