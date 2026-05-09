"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, FolderKanban, Users, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatarData } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Projeto {
  id: string;
  titulo: string;
  descricao: string | null;
  areaTematica: string | null;
  dataInicio: string | null;
  dataFimPrevista: string | null;
  status: string;
  coordenador: { id: string; nomeCompleto: string };
  _count: { membros: number; atividades: number };
}

const statusOpts = [
  { value: "EM_ANDAMENTO", label: "Em Andamento" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "SUSPENSO", label: "Suspenso" },
];

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [supervisores, setSupervisores] = useState<Array<{ id: string; nomeCompleto: string }>>([]);
  const [form, setForm] = useState({
    titulo: "", descricao: "", areaTematica: "", dataInicio: "",
    dataFimPrevista: "", status: "EM_ANDAMENTO", coordenadorId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { user } = useAuth();

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projetos?page=${page}&busca=${encodeURIComponent(busca)}`);
      const data = await res.json();
      setProjetos(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setProjetos([]);
    } finally {
      setLoading(false);
    }
  }, [page, busca]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (user?.perfil === "ADMINISTRADOR") {
      fetch("/api/usuarios?perfil=SUPERVISOR&pageSize=100")
        .then((r) => r.json())
        .then((d) => setSupervisores(d.data || []))
        .catch(() => {});
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { toast("error", data.error || "Erro ao criar projeto"); return; }
    toast("success", "Projeto criado com sucesso!");
    setModalOpen(false);
    carregar();
  }

  const pageSize = 25;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projetos</h1>
          <p className="text-sm text-[var(--text-secondary)]">{total} projeto(s)</p>
        </div>
        {user?.perfil === "ADMINISTRADOR" && (
          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            Novo Projeto
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPage(1); }}
          placeholder="Buscar projetos..."
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.25)] transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {projetos.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
                <FolderKanban size={22} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Nenhum projeto encontrado</p>
              <p className="text-xs text-[var(--text-muted)]">Crie um novo projeto para começar</p>
            </div>
          )}
          {projetos.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link href={`/projetos/${p.id}`}>
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5 hover:shadow-[0_0_20px_rgba(37,99,235,0.12)] hover:border-[rgba(37,99,235,0.3)] transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug flex-1">{p.titulo}</h3>
                    <Badge value={p.status} />
                  </div>
                  {p.descricao && (
                    <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">{p.descricao}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1"><Users size={12} />{p._count.membros} membros</span>
                    <span className="flex items-center gap-1"><Activity size={12} />{p._count.atividades} atividades</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>{p.coordenador.nomeCompleto}</span>
                    <span className="font-mono">{formatarData(p.dataFimPrevista)}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="flex items-center text-sm text-[var(--text-secondary)]">Pág. {page}/{totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Projeto" size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Título" value={form.titulo} onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} required />
          <Textarea label="Descrição / Objetivo" value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} />
          <Input label="Área Temática" value={form.areaTematica} onChange={(e) => setForm(f => ({ ...f, areaTematica: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data de Início" type="date" value={form.dataInicio} onChange={(e) => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
            <Input label="Término Previsto" type="date" value={form.dataFimPrevista} onChange={(e) => setForm(f => ({ ...f, dataFimPrevista: e.target.value }))} />
            <Select label="Status" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} options={statusOpts} />
            <Select
              label="Coordenador"
              value={form.coordenadorId}
              onChange={(e) => setForm(f => ({ ...f, coordenadorId: e.target.value }))}
              options={supervisores.map((s) => ({ value: s.id, label: s.nomeCompleto }))}
              placeholder="Selecione..."
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Criar Projeto</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
