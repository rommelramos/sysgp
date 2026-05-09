"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FolderKanban, Users, Activity, DollarSign } from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatarData, formatarMoeda } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardData {
  projetosAtivos: number;
  bolsasVigentes: number;
  totalBolsas: number;
  totalUsuarios: number;
  atividadesRecentes: Array<{
    id: string;
    titulo: string;
    dataInicio: string | null;
    projeto: { titulo: string };
    usuario: { nomeCompleto: string };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Olá, {user?.nome?.split(" ")[0]} 👋
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Aqui está o resumo do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatCard
            title="Projetos Ativos"
            value={data?.projetosAtivos ?? 0}
            icon={<FolderKanban size={20} />}
            color="blue"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard
            title="Bolsas Vigentes"
            value={data?.bolsasVigentes ?? 0}
            icon={<Users size={20} />}
            color="cyan"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard
            title="Total Bolsas/mês"
            value={formatarMoeda(data?.totalBolsas ?? 0)}
            icon={<DollarSign size={20} />}
            color="green"
          />
        </motion.div>
        {user?.perfil === "ADMINISTRADOR" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <StatCard
              title="Usuários Ativos"
              value={data?.totalUsuarios ?? 0}
              icon={<Users size={20} />}
              color="amber"
            />
          </motion.div>
        )}
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Activity size={16} className="text-[var(--accent-primary)]" />
            Atividades Recentes
          </h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {data?.atividadesRecentes?.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
              Nenhuma atividade registrada ainda.
            </p>
          )}
          {data?.atividadesRecentes?.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between px-6 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{a.titulo}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {a.usuario.nomeCompleto} • {a.projeto.titulo}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                {a.dataInicio && (
                  <span className="text-xs text-[var(--text-secondary)] font-mono">
                    {formatarData(a.dataInicio)}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
