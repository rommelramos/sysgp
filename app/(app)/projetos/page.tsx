"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, FolderKanban, Users, Clock, Grid3X3, List, Pencil, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatarData } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Projeto {
  id: string;
  titulo: string;
  descricao: string | null;
  areaTematica: string | null;
  instituicaoExecucao: string | null;
  instituicaoFinanciadora: string | null;
  areaConhecimento: string | null;
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

const filterTabs = [
  { key: "ALL",          label: "Todos" },
  { key: "EM_ANDAMENTO", label: "Em Andamento" },
  { key: "CONCLUIDO",    label: "Concluído" },
  { key: "SUSPENSO",     label: "Suspenso" },
];

const iconColors = [
  "#2563EB", "#0EA5E9", "#6366F1", "#3B82F6", "#06B6D4", "#8B5CF6",
  "#0D9488", "#F59E0B", "#EF4444", "#EC4899",
];

function getProgress(projeto: Projeto): number {
  if (projeto.status === "CONCLUIDO") return 100;
  if (projeto.status === "SUSPENSO") return 0;
  // Deterministic pseudo-progress from id hash
  const hash = projeto.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return 20 + (hash % 65);
}

function getDaysRemaining(dataFim: string | null): string {
  if (!dataFim) return "—";
  const diff = Math.ceil((new Date(dataFim).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "Encerrado";
  if (diff === 0) return "Hoje";
  if (diff === 1) return "1 dia";
  if (diff < 7) return `${diff} dias`;
  const weeks = Math.floor(diff / 7);
  return weeks === 1 ? "1 semana" : `${weeks} semanas`;
}

function AvatarGroup({ count }: { count: number }) {
  const colors = ["#2563EB", "#0EA5E9", "#6366F1", "#8B5CF6", "#0D9488"];
  const show = Math.min(count, 3);
  if (count === 0) return <span className="text-xs text-[var(--text-muted)]">Sem membros</span>;
  return (
    <div className="flex items-center -space-x-1.5">
      {Array.from({ length: show }).map((_, i) => (
        <div
          key={i}
          style={{ backgroundColor: colors[i % colors.length], zIndex: show - i }}
          className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white relative"
        >
          {String.fromCharCode(65 + i)}
        </div>
      ))}
      {count > 3 && (
        <div className="w-7 h-7 rounded-full border-2 border-white bg-[var(--bg-elevated)] flex items-center justify-center text-[10px] font-semibold text-[var(--text-secondary)] relative">
          +{count - 3}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ projeto, index, onEdit }: { projeto: Projeto; index: number; onEdit?: (p: Projeto) => void }) {
  const color = iconColors[index % iconColors.length];
  const progress = getProgress(projeto);
  const daysLeft = getDaysRemaining(projeto.dataFimPrevista);

  return (
    <Link href={`/projetos/${projeto.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="bg-white rounded-2xl p-5 border border-[var(--border)] shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_24px_rgba(37,99,235,0.1)] hover:border-blue-200 transition-all duration-200 cursor-pointer flex flex-col gap-3 h-full"
      >
        {/* Project icon */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: color }}
        >
          <FolderKanban size={20} className="text-white" aria-hidden="true" />
        </div>

        {/* Name */}
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
            {projeto.titulo}
          </h3>
        </div>

        {/* Meta: team + deadline */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            <Users size={13} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{projeto.coordenador.nomeCompleto}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            <Clock size={13} className="shrink-0" aria-hidden="true" />
            <span>{daysLeft}</span>
          </div>
        </div>

        {/* Footer: avatars + progress + edit */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border)]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Equipe</span>
            <AvatarGroup count={projeto._count.membros} />
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={(e) => { e.preventDefault(); onEdit(projeto); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-blue-50 transition-colors"
                aria-label="Editar projeto"
              >
                <Pencil size={13} />
              </button>
            )}
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Progresso</span>
              <span className="text-[20px] font-bold text-[var(--text-primary)] leading-none">{progress}%</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function ProjectListRow({ projeto, index, onEdit }: { projeto: Projeto; index: number; onEdit?: (p: Projeto) => void }) {
  const color = iconColors[index % iconColors.length];
  const progress = getProgress(projeto);

  return (
    <Link href={`/projetos/${projeto.id}`}>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className="bg-white rounded-xl px-5 py-4 border border-[var(--border)] hover:shadow-[0_2px_12px_rgba(37,99,235,0.08)] hover:border-blue-200 transition-all duration-200 cursor-pointer flex items-center gap-4"
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: color }}
        >
          <FolderKanban size={16} className="text-white" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0" style={{ marginLeft: '5px' }}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{projeto.titulo}</h3>
          <p className="text-xs text-[var(--text-muted)] truncate">{projeto.coordenador.nomeCompleto}</p>
        </div>
        <div className="hidden sm:flex items-center gap-6 shrink-0">
          <div className="text-right" style={{ marginLeft: '5px' }}>
            <p className="text-xs text-[var(--text-muted)]">Membros</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{projeto._count.membros}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Prazo</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">{formatarData(projeto.dataFimPrevista)}</p>
          </div>
          <div className="text-right min-w-[48px]" style={{ marginLeft: '5px' }}>
            <p className="text-xs text-[var(--text-muted)]">Progresso</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">{progress}%</p>
          </div>
        </div>
        <Badge value={projeto.status} />
        {onEdit && (
          <button
            onClick={(e) => { e.preventDefault(); onEdit(projeto); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-blue-50 transition-colors shrink-0"
            aria-label="Editar projeto"
          >
            <Pencil size={13} />
          </button>
        )}
      </motion.div>
    </Link>
  );
}

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Projeto | null>(null);
  const [supervisores, setSupervisores] = useState<Array<{ id: string; nomeCompleto: string }>>([]);
  const [form, setForm] = useState({
    titulo: "", descricao: "", areaTematica: "",
    instituicaoExecucao: "", instituicaoFinanciadora: "", areaConhecimento: "",
    dataInicio: "", dataFimPrevista: "", status: "EM_ANDAMENTO", coordenadorId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [extraindo, setExtraindo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      fetch("/api/usuarios?podeSerCoordenador=true&pageSize=200")
        .then((r) => r.json())
        .then((d) => setSupervisores(d.data || []))
        .catch(() => {});
    }
  }, [user]);

  function openCreate() {
    setEditTarget(null);
    setForm({ titulo: "", descricao: "", areaTematica: "", instituicaoExecucao: "", instituicaoFinanciadora: "", areaConhecimento: "", dataInicio: "", dataFimPrevista: "", status: "EM_ANDAMENTO", coordenadorId: "" });
    setModalOpen(true);
  }

  function openEdit(p: Projeto) {
    setEditTarget(p);
    setForm({
      titulo: p.titulo,
      descricao: p.descricao || "",
      areaTematica: p.areaTematica || "",
      instituicaoExecucao: p.instituicaoExecucao || "",
      instituicaoFinanciadora: p.instituicaoFinanciadora || "",
      areaConhecimento: p.areaConhecimento || "",
      dataInicio: p.dataInicio ? p.dataInicio.slice(0, 10) : "",
      dataFimPrevista: p.dataFimPrevista ? p.dataFimPrevista.slice(0, 10) : "",
      status: p.status,
      coordenadorId: p.coordenador.id,
    });
    setModalOpen(true);
  }

  async function handleExtrair(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setExtraindo(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const res = await fetch("/api/projetos/extrair", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast("error", data.error || "Erro ao extrair dados do arquivo");
        return;
      }
      const d = data.dados as Partial<typeof form>;
      setForm(f => ({
        ...f,
        ...(d.titulo           ? { titulo: d.titulo }                         : {}),
        ...(d.descricao        ? { descricao: d.descricao }                   : {}),
        ...(d.areaTematica     ? { areaTematica: d.areaTematica }             : {}),
        ...(d.areaConhecimento ? { areaConhecimento: d.areaConhecimento }     : {}),
        ...(d.instituicaoExecucao     ? { instituicaoExecucao: d.instituicaoExecucao }     : {}),
        ...(d.instituicaoFinanciadora ? { instituicaoFinanciadora: d.instituicaoFinanciadora } : {}),
        ...(d.dataInicio       ? { dataInicio: d.dataInicio }                 : {}),
        ...(d.dataFimPrevista  ? { dataFimPrevista: d.dataFimPrevista }       : {}),
      }));
      const filled = Object.keys(d).length;
      toast("success", `${filled} campo(s) preenchido(s) automaticamente`);
    } catch {
      toast("error", "Erro ao processar o arquivo");
    } finally {
      setExtraindo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const url = editTarget ? `/api/projetos/${editTarget.id}` : "/api/projetos";
    const method = editTarget ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { toast("error", data.error || "Erro ao salvar projeto"); return; }
    toast("success", editTarget ? "Projeto atualizado!" : "Projeto criado com sucesso!");
    setModalOpen(false);
    carregar();
  }

  // Client-side filter by status tab
  const filtered = filtro === "ALL" ? projetos : projetos.filter((p) => p.status === filtro);

  // Tab counts from current page data
  const tabCounts: Record<string, number> = { ALL: total };
  projetos.forEach((p) => {
    tabCounts[p.status] = (tabCounts[p.status] || 0) + 1;
  });

  const pageSize = 25;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6" style={{ marginLeft: '5px' }}>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div style={{ marginLeft: '5px' }}>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projetos</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{total} projeto(s) no total</p>
        </div>
        {user?.perfil === "ADMINISTRADOR" && (
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            Novo Projeto
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* FilterTabs */}
        <div className="flex items-center gap-1 bg-white border border-[var(--border)] rounded-xl p-1 shadow-[var(--shadow-sm)]">
          {filterTabs.map((tab) => {
            const count = tab.key === "ALL" ? total : (tabCounts[tab.key] || 0);
            const active = filtro === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFiltro(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 whitespace-nowrap",
                  active
                    ? "bg-[var(--accent-primary)] text-white shadow-[0_1px_4px_rgba(37,99,235,0.25)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                )}
              >
                {tab.label}
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                  active ? "bg-white/20 text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right controls: search + view toggle */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPage(1); }}
              placeholder="Buscar projetos..."
              className="bg-white border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)] transition-all w-48"
            />
          </div>
          <div className="flex items-center bg-white border border-[var(--border)] rounded-lg p-1 gap-0.5 shadow-[var(--shadow-sm)]">
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Visualização em grade"
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md transition-all",
                viewMode === "grid"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              )}
            >
              <Grid3X3 size={14} aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              aria-label="Visualização em lista"
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md transition-all",
                viewMode === "list"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              )}
            >
              <List size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-56">
          <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ marginLeft: '5px' }}>
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center" style={{ marginLeft: '5px' }}>
            <FolderKanban size={26} className="text-blue-300" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Nenhum projeto encontrado</p>
          <p className="text-xs text-[var(--text-muted)]">
            {busca ? `Sem resultados para "${busca}"` : "Crie um novo projeto para começar"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((p, i) => (
              <ProjectCard key={p.id} projeto={p} index={i} onEdit={user?.perfil === "ADMINISTRADOR" ? openEdit : undefined} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((p, i) => (
              <ProjectListRow key={p.id} projeto={p} index={i} onEdit={user?.perfil === "ADMINISTRADOR" ? openEdit : undefined} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="flex items-center text-sm text-[var(--text-secondary)] px-2">Pág. {page}/{totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}

      {/* Create/edit project modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Editar Projeto" : "Novo Projeto"} size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4" style={{ marginLeft: '5px', marginRight: '5px' }}>
          {/* Import from file */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <FileText size={16} className="text-blue-500 shrink-0" />
            <p className="text-[12px] text-blue-700 flex-1">Importe um arquivo de texto para preencher os campos automaticamente com IA.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.doc,.docx"
              className="hidden"
              onChange={handleExtrair}
            />
            <button
              type="button"
              disabled={extraindo}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {extraindo ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              {extraindo ? "Extraindo..." : "Selecionar arquivo"}
            </button>
          </div>
          <Input label="Título" value={form.titulo} onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} required />
          <Textarea label="Descrição / Objetivo" value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Área Temática" value={form.areaTematica} onChange={(e) => setForm(f => ({ ...f, areaTematica: e.target.value }))} />
            <Input label="Área de Conhecimento (CNPq)" value={form.areaConhecimento} onChange={(e) => setForm(f => ({ ...f, areaConhecimento: e.target.value }))} placeholder="Ex: Ciências Exatas e da Terra" />
            <Input label="Instituição de Execução" value={form.instituicaoExecucao} onChange={(e) => setForm(f => ({ ...f, instituicaoExecucao: e.target.value }))} placeholder="Ex: UFPA" />
            <Input label="Instituição Financiadora" value={form.instituicaoFinanciadora} onChange={(e) => setForm(f => ({ ...f, instituicaoFinanciadora: e.target.value }))} placeholder="Ex: CNPq, FAPESPA" />
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
            <Button type="submit" loading={submitting}>{editTarget ? "Salvar Alterações" : "Criar Projeto"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
