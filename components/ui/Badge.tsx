import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  ativo:        "bg-emerald-50  text-emerald-700 border-emerald-200",
  encerrado:    "bg-slate-100   text-slate-600   border-slate-200",
  suspenso:     "bg-amber-50    text-amber-700   border-amber-200",
  em_andamento: "bg-blue-50     text-blue-700    border-blue-200",
  concluido:    "bg-emerald-50  text-emerald-700 border-emerald-200",
  membro:       "bg-slate-100   text-slate-600   border-slate-200",
  supervisor:   "bg-teal-50     text-teal-700    border-teal-200",
  administrador:"bg-violet-50   text-violet-700  border-violet-200",
  bolsista:     "bg-emerald-50  text-emerald-700 border-emerald-200",
  info:         "bg-blue-50     text-blue-700    border-blue-200",
  warning:      "bg-amber-50    text-amber-700   border-amber-200",
  danger:       "bg-red-50      text-red-700     border-red-200",
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
