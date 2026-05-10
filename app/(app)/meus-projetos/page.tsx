"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FolderKanban, Users, Activity } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatarData } from "@/lib/utils";

interface Projeto {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  dataFimPrevista: string | null;
  coordenador: { nomeCompleto: string };
  _count: { membros: number; atividades: number };
}

export default function MeusProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projetos?pageSize=100")
      .then((r) => r.json())
      .then((d) => setProjetos(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5" style={{ marginLeft: '5px' }}>
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Meus Projetos</h1>
        <p className="text-sm text-[var(--text-secondary)]">Projetos aos quais você está vinculado</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projetos.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">
          <FolderKanban size={32} className="mx-auto mb-3 opacity-40" />
          <p>Você não está vinculado a nenhum projeto ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projetos.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/projetos/${p.id}`}>
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5 hover:shadow-[0_0_20px_rgba(37,99,235,0.12)] hover:border-[rgba(37,99,235,0.3)] transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex-1">{p.titulo}</h3>
                    <Badge value={p.status} />
                  </div>
                  {p.descricao && <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">{p.descricao}</p>}
                  <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1"><Users size={11} />{p._count.membros}</span>
                    <span className="flex items-center gap-1"><Activity size={11} />{p._count.atividades}</span>
                    <span className="ml-auto font-mono">{formatarData(p.dataFimPrevista)}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
