"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { FolderKanban, Users, DollarSign, Activity, ArrowRight, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatarData, formatarMoeda } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

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

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[14px] p-5 space-y-3">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-7 w-16 rounded" />
        </div>
        <div className="skeleton w-10 h-10 rounded-[10px]" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <div className="space-y-1.5 flex-1">
        <div className="skeleton h-3 w-48 rounded" />
        <div className="skeleton h-2.5 w-32 rounded" />
      </div>
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.nome?.split(" ")[0];

  return (
    <div className="space-y-8 pb-4" style={{ marginLeft: '5px' }}>

      {/* Header */}
      <div style={{ marginLeft: '5px' }}>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight"
        >
          Olá, {firstName} 👋
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.4 }}
          className="text-[var(--text-secondary)] text-sm mt-1"
        >
          Aqui está o resumo atual do sistema
        </motion.p>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          <motion.div variants={item}>
            <StatCard
              title="Projetos Ativos"
              value={data?.projetosAtivos ?? 0}
              icon={<FolderKanban size={18} />}
              color="blue"
              subtitle="em andamento"
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              title="Bolsas Vigentes"
              value={data?.bolsasVigentes ?? 0}
              icon={<Users size={18} />}
              color="teal"
              subtitle="bolsistas ativos"
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              title="Valor Mensal"
              value={formatarMoeda(data?.totalBolsas ?? 0)}
              icon={<DollarSign size={18} />}
              color="green"
              subtitle="total em bolsas"
            />
          </motion.div>
          {user?.perfil === "ADMINISTRADOR" && (
            <motion.div variants={item}>
              <StatCard
                title="Usuários Ativos"
                value={data?.totalUsuarios ?? 0}
                icon={<Users size={18} />}
                color="purple"
                subtitle="no sistema"
              />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Recent Activities */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[14px] shadow-[var(--shadow-card)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5" style={{ marginLeft: '5px' }}>
            <div className="w-7 h-7 rounded-[8px] bg-[var(--accent-primary)]/10 flex items-center justify-center">
              <Activity size={14} className="text-[var(--accent-primary)]" />
            </div>
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
              Atividades Recentes
            </h2>
          </div>
          <Link
            href="/atividades"
            className="text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1"
          >
            Ver todas <ArrowRight size={12} />
          </Link>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[var(--border)]">
          {loading && Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)}

          {!loading && data?.atividadesRecentes?.length === 0 && (
            <div className="px-6 py-12 text-center" style={{ marginLeft: '5px' }}>
              <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-3">
                <Activity size={18} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Nenhuma atividade registrada ainda.</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">As atividades dos projetos aparecerão aqui.</p>
            </div>
          )}

          {!loading && data?.atividadesRecentes?.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 + i * 0.04 }}
              className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-elevated)] transition-colors group"
            >
              {/* Dot */}
              <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]/40 group-hover:bg-[var(--accent-primary)] transition-colors shrink-0" />

              <div className="flex-1 min-w-0" style={{ marginLeft: '5px' }}>
                <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                  {a.titulo}
                </p>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5 truncate">
                  {a.usuario.nomeCompleto}
                  <span className="mx-1.5 text-[var(--text-muted)]/40">·</span>
                  {a.projeto.titulo}
                </p>
              </div>

              {a.dataInicio && (
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] shrink-0">
                  <Clock size={11} />
                  <span className="font-mono">{formatarData(a.dataInicio)}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
