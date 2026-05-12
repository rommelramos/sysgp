"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users, Clock, CheckCircle2, Circle, CalendarDays,
  Building2, BookOpen, Trophy, Activity, Pencil, Filter, X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatarData, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Membro {
  id: string;
  projetoId: string;
  usuarioId: string;
  funcao: string | null;
  isCoordenador: boolean;
  isBolsista: boolean;
  statusVinculo: string;
  usuario: { id: string; nomeCompleto: string; email: string; perfil: string };
}

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
  coordenador: { id: string; nomeCompleto: string; email: string };
  membros: Membro[];
  _count: { atividades: number };
}

interface Atividade {
  id: string;
  titulo: string;
  descricao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  concluida: boolean;
  usuario: { id: string; nomeCompleto: string };
  meta: { id: string; descricao: string; ordem: number } | null;
}

interface AtividadesFiltros {
  usuarioId: string;
  dataInicio: string;
  dataFim: string;
  concluida: "" | "true" | "false";
}

const memberColors = ["#2563EB", "#0EA5E9", "#6366F1", "#8B5CF6", "#0D9488", "#F59E0B", "#EF4444", "#EC4899"];

function avatarColor(idx: number) { return memberColors[idx % memberColors.length]; }

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function ProgressCircle({ value, size = 64 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={value >= 100 ? "#10B981" : value >= 60 ? "#3B82F6" : value >= 30 ? "#F59E0B" : "#EF4444"}
        strokeWidth={6} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}

function AtividadeCard({ atividade, onToggle }: { atividade: Atividade; onToggle: (id: string, concluida: boolean) => void }) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    await onToggle(atividade.id, !atividade.concluida);
    setToggling(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border transition-all",
        atividade.concluida
          ? "bg-green-50/50 border-green-100"
          : "bg-white border-[var(--border)] hover:border-blue-200 hover:shadow-sm"
      )}
    >
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={cn(
          "mt-0.5 shrink-0 transition-colors rounded-full",
          atividade.concluida
            ? "text-green-500 hover:text-green-600"
            : "text-[var(--text-muted)] hover:text-[var(--accent-primary)]",
          toggling && "opacity-50 cursor-not-allowed"
        )}
        aria-label={atividade.concluida ? "Marcar como pendente" : "Marcar como concluída"}
      >
        {atividade.concluida
          ? <CheckCircle2 size={20} />
          : <Circle size={20} />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-semibold leading-snug",
          atividade.concluida ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"
        )}>
          {atividade.titulo}
        </p>

        {atividade.descricao && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{atividade.descricao}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
          <span className="text-[11px] text-[var(--text-muted)]">{atividade.usuario.nomeCompleto}</span>
          {(atividade.dataInicio || atividade.dataFim) && (
            <span className="text-[11px] text-[var(--text-muted)]">
              {formatarData(atividade.dataInicio)} {atividade.dataFim ? `→ ${formatarData(atividade.dataFim)}` : ""}
            </span>
          )}
          {atividade.meta && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
              Meta {atividade.meta.ordem}: {atividade.meta.descricao.slice(0, 40)}
            </span>
          )}
        </div>
      </div>

      {atividade.concluida && (
        <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full shrink-0">Concluída</span>
      )}
    </motion.div>
  );
}

export default function ProjetoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [atividadesTotal, setAtividadesTotal] = useState(0);
  const [atividadesConcluidas, setAtividadesConcluidas] = useState(0);
  const [loadingProjeto, setLoadingProjeto] = useState(true);
  const [loadingAtividades, setLoadingAtividades] = useState(true);
  const [filtros, setFiltros] = useState<AtividadesFiltros>({ usuarioId: "", dataInicio: "", dataFim: "", concluida: "" });
  const [filtrosAberto, setFiltrosAberto] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoadingProjeto(true);
    fetch(`/api/projetos/${id}`)
      .then((r) => r.json())
      .then((d) => { setProjeto(d); setLoadingProjeto(false); })
      .catch(() => { toast("error", "Erro ao carregar projeto"); setLoadingProjeto(false); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const carregarAtividades = useCallback(async () => {
    if (!id) return;
    setLoadingAtividades(true);
    const params = new URLSearchParams({ projetoId: id, pageSize: "100" });
    if (filtros.usuarioId) params.set("usuarioId", filtros.usuarioId);
    if (filtros.dataInicio) params.set("dataInicio", filtros.dataInicio);
    if (filtros.dataFim) params.set("dataFim", filtros.dataFim);
    if (filtros.concluida !== "") params.set("concluida", filtros.concluida);

    try {
      const [resAll, resConcluidas] = await Promise.all([
        fetch(`/api/atividades?${params}`).then((r) => r.json()),
        fetch(`/api/atividades?projetoId=${id}&concluida=true&pageSize=1`).then((r) => r.json()),
      ]);
      setAtividades(resAll.data || []);
      setAtividadesTotal(resAll.total || 0);
      setAtividadesConcluidas(resConcluidas.total || 0);
    } catch {
      setAtividades([]);
    } finally {
      setLoadingAtividades(false);
    }
  }, [id, filtros]);

  useEffect(() => { carregarAtividades(); }, [carregarAtividades]);

  async function toggleConcluida(atividadeId: string, concluida: boolean) {
    const res = await fetch(`/api/atividades/${atividadeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concluida }),
    });
    if (!res.ok) { toast("error", "Erro ao atualizar atividade"); return; }
    setAtividades((prev) => prev.map((a) => a.id === atividadeId ? { ...a, concluida } : a));
    setAtividadesConcluidas((prev) => concluida ? prev + 1 : Math.max(0, prev - 1));
  }

  function limparFiltros() {
    setFiltros({ usuarioId: "", dataInicio: "", dataFim: "", concluida: "" });
  }

  const hasFiltros = filtros.usuarioId || filtros.dataInicio || filtros.dataFim || filtros.concluida;
  const totalAtividadesProjeto = projeto?._count.atividades ?? 0;
  const progress = projeto?.status === "CONCLUIDO"
    ? 100
    : projeto?.status === "SUSPENSO"
    ? 0
    : totalAtividadesProjeto > 0
    ? Math.round((atividadesConcluidas / totalAtividadesProjeto) * 100)
    : (() => {
        if (!projeto?.dataInicio || !projeto?.dataFimPrevista) return 0;
        const start = new Date(projeto.dataInicio).getTime();
        const end = new Date(projeto.dataFimPrevista).getTime();
        const now = Date.now();
        if (now <= start) return 0;
        if (now >= end) return 99;
        return Math.round(((now - start) / (end - start)) * 100);
      })();

  if (loadingProjeto) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm font-semibold text-[var(--text-secondary)]">Projeto não encontrado</p>
        <Button variant="secondary" onClick={() => router.back()}>Voltar</Button>
      </div>
    );
  }

  const membrosOpts = projeto.membros.map((m) => ({ value: m.usuario.id, label: m.usuario.nomeCompleto }));

  return (
    <div className="space-y-6" style={{ marginLeft: "5px" }}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="mt-1 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{projeto.titulo}</h1>
            <Badge value={projeto.status} />
          </div>
          {projeto.descricao && (
            <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{projeto.descricao}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-[var(--border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Users size={16} className="text-blue-500" />
          </div>
          <div style={{ marginLeft: "5px" }}>
            <p className="text-xs text-[var(--text-muted)]">Membros</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{projeto.membros.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[var(--border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Activity size={16} className="text-indigo-500" />
          </div>
          <div style={{ marginLeft: "5px" }}>
            <p className="text-xs text-[var(--text-muted)]">Atividades</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              <span className="text-green-600">{atividadesConcluidas}</span>
              <span className="text-[var(--text-muted)] text-sm font-normal">/{totalAtividadesProjeto}</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[var(--border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Clock size={16} className="text-amber-500" />
          </div>
          <div style={{ marginLeft: "5px" }}>
            <p className="text-xs text-[var(--text-muted)]">Prazo</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">{formatarData(projeto.dataFimPrevista) || "—"}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[var(--border)] flex items-center gap-3">
          <div className="relative shrink-0">
            <ProgressCircle value={progress} size={52} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[var(--text-primary)]">
              {progress}%
            </span>
          </div>
          <div style={{ marginLeft: "5px" }}>
            <p className="text-xs text-[var(--text-muted)]">Progresso</p>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              {totalAtividadesProjeto > 0 ? "atividades" : "tempo"}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout: info + members */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project info */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-[var(--border)] space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Informações do Projeto</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={Users} label="Coordenador" value={projeto.coordenador.nomeCompleto} />
            <InfoItem icon={CalendarDays} label="Período" value={
              projeto.dataInicio || projeto.dataFimPrevista
                ? `${formatarData(projeto.dataInicio) || "—"} → ${formatarData(projeto.dataFimPrevista) || "—"}`
                : null
            } />
            <InfoItem icon={BookOpen} label="Área Temática" value={projeto.areaTematica} />
            <InfoItem icon={Trophy} label="Área de Conhecimento" value={projeto.areaConhecimento} />
            <InfoItem icon={Building2} label="Inst. de Execução" value={projeto.instituicaoExecucao} />
            <InfoItem icon={Building2} label="Inst. Financiadora" value={projeto.instituicaoFinanciadora} />
          </div>
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl p-5 border border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Equipe</h2>
          <div className="space-y-2">
            {projeto.membros.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">Nenhum membro vinculado</p>
            )}
            {projeto.membros.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ backgroundColor: avatarColor(idx) }}
                >
                  {getInitials(m.usuario.nomeCompleto)}
                </div>
                <div className="flex-1 min-w-0" style={{ marginLeft: "5px" }}>
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{m.usuario.nomeCompleto}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    {m.isCoordenador ? "Coordenador" : m.funcao || "Membro"}
                    {m.isBolsista ? " · Bolsista" : ""}
                  </p>
                </div>
                {m.statusVinculo !== "ATIVO" && (
                  <Badge value={m.statusVinculo} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activities section */}
      <div className="bg-white rounded-xl border border-[var(--border)]">
        {/* Activities header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div style={{ marginLeft: "5px" }}>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Atividades</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{atividadesTotal} atividade(s) encontrada(s)</p>
          </div>
          <button
            onClick={() => setFiltrosAberto((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              filtrosAberto || hasFiltros
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "text-[var(--text-secondary)] border border-[var(--border)] hover:border-blue-200"
            )}
          >
            <Filter size={12} />
            Filtros
            {hasFiltros && (
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                {[filtros.usuarioId, filtros.dataInicio, filtros.dataFim, filtros.concluida].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {filtrosAberto && (
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select
                label="Membro"
                value={filtros.usuarioId}
                onChange={(e) => setFiltros((f) => ({ ...f, usuarioId: e.target.value }))}
                options={membrosOpts}
                placeholder="Todos os membros"
              />
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Data início (a partir de)</label>
                <input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros((f) => ({ ...f, dataInicio: e.target.value }))}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Data fim (até)</label>
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
                <div className="flex gap-1">
                  {(["", "false", "true"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setFiltros((f) => ({ ...f, concluida: v }))}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-semibold transition-colors border",
                        filtros.concluida === v
                          ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]"
                          : "bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-blue-200"
                      )}
                    >
                      {v === "" ? "Todas" : v === "false" ? "Pendentes" : "Concluídas"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {hasFiltros && (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={11} /> Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Activity list */}
        <div className="p-5">
          {loadingAtividades ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : atividades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Activity size={24} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">
                {hasFiltros ? "Nenhuma atividade com os filtros aplicados" : "Nenhuma atividade registrada"}
              </p>
              {hasFiltros && (
                <button onClick={limparFiltros} className="text-xs text-blue-600 hover:underline">Limpar filtros</button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {atividades.map((a) => (
                <AtividadeCard key={a.id} atividade={a} onToggle={toggleConcluida} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin-only edit hint */}
      {user?.perfil === "ADMINISTRADOR" && (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil size={13} />}
            onClick={() => router.push("/projetos")}
          >
            Editar projeto
          </Button>
        </div>
      )}
    </div>
  );
}
