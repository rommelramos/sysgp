"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, Pencil, Trash2, ChevronDown, Activity } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { FileUpload, UploadedFile } from "@/components/shared/FileUpload";
import { useToast } from "@/components/ui/Toast";
import { formatarData } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Atividade {
  id: string;
  titulo: string;
  descricao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  concluida: boolean;
  projeto: { id: string; titulo: string };
  usuario: { id: string; nomeCompleto: string };
  meta: { id: string; descricao: string; ordem: number } | null;
  documentos: Array<{ id: string; nomeOriginal: string; mimeType: string }>;
}

interface AcaoDocumento {
  id: string;
  nomeOriginal: string;
  mimeType: string;
  rotulo?: string | null;
  detalhe?: string | null;
}

interface AcaoAtividade {
  id: string;
  descricao: string;
  dataOcorrido: string;
  documentos: AcaoDocumento[];
}

interface MetaOpt { id: string; descricao: string; ordem: number; }
interface UsuarioOpt { id: string; nomeCompleto: string; }

function getRowClass(a: Atividade): string {
  if (a.concluida) return "border-[var(--border)] bg-[var(--bg-surface)] opacity-60";
  if (!a.dataFim) return "border-[var(--border)] bg-[var(--bg-surface)]";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazo = new Date(a.dataFim);
  prazo.setHours(0, 0, 0, 0);
  const dias = Math.ceil((prazo.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return "border-red-500 bg-red-500/5";
  if (dias <= 7) return "border-orange-400 bg-orange-400/5";
  return "border-[var(--border)] bg-[var(--bg-surface)]";
}

export default function AtividadesPage() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filtroUsuarioId, setFiltroUsuarioId] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);

  // Modal / form (atividade)
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Atividade | null>(null);
  const [projetos, setProjetos] = useState<Array<{ id: string; titulo: string }>>([]);
  const [metas, setMetas] = useState<MetaOpt[]>([]);
  const [form, setForm] = useState({ projetoId: "", metaId: "", titulo: "", descricao: "", dataInicio: "", dataFim: "", concluida: false });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm (atividade)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Ações state
  const [expandedAcoes, setExpandedAcoes] = useState<Set<string>>(new Set());
  const [acoesPorAtividade, setAcoesPorAtividade] = useState<Record<string, AcaoAtividade[]>>({});
  const [acaoLoadingId, setAcaoLoadingId] = useState<string | null>(null);
  const [acaoDeletingId, setAcaoDeletingId] = useState<string | null>(null);

  // Nova ação modal
  const [acaoModalOpen, setAcaoModalOpen] = useState(false);
  const [acaoAtividadeId, setAcaoAtividadeId] = useState<string | null>(null);
  const [acaoForm, setAcaoForm] = useState({ descricao: "", dataOcorrido: "" });
  const [acaoFiles, setAcaoFiles] = useState<UploadedFile[]>([]);
  const [acaoSubmitting, setAcaoSubmitting] = useState(false);

  // Editar ação modal
  const [editAcaoModalOpen, setEditAcaoModalOpen] = useState(false);
  const [editAcaoTarget, setEditAcaoTarget] = useState<AcaoAtividade | null>(null);
  const [editAcaoAtividadeId, setEditAcaoAtividadeId] = useState<string | null>(null);
  const [editAcaoForm, setEditAcaoForm] = useState({ descricao: "", dataOcorrido: "" });
  const [editAcaoNewFiles, setEditAcaoNewFiles] = useState<UploadedFile[]>([]);
  const [editAcaoSubmitting, setEditAcaoSubmitting] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const toast = useToast();
  const { user } = useAuth();

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filtroUsuarioId) params.set("usuarioId", filtroUsuarioId);
      if (periodoInicio) params.set("periodoInicio", periodoInicio);
      if (periodoFim) params.set("periodoFim", periodoFim);
      const res = await fetch(`/api/atividades?${params}`);
      const data = await res.json();
      setAtividades(data.data || []);
      setTotal(data.total || 0);
      // Reset expanded ações on reload
      setExpandedAcoes(new Set());
      setAcoesPorAtividade({});
    } catch {
      setAtividades([]);
    } finally {
      setLoading(false);
    }
  }, [page, filtroUsuarioId, periodoInicio, periodoFim]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/projetos?pageSize=100")
      .then((r) => r.json())
      .then((d) => setProjetos(d.data || []))
      .catch(() => {});
    if (user.perfil === "ADMINISTRADOR") {
      fetch("/api/usuarios?pageSize=200")
        .then((r) => r.json())
        .then((d) => setUsuarios(d.data || []))
        .catch(() => {});
    } else if (user.perfil === "SUPERVISOR") {
      fetch(`/api/usuarios?supervisorId=${user.id}&pageSize=200`)
        .then((r) => r.json())
        .then((d) => setUsuarios(d.data || []))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!form.projetoId || !user?.id) { setMetas([]); return; }
    fetch(`/api/vinculos?projetoId=${form.projetoId}&usuarioId=${user.id}&pageSize=10`)
      .then((r) => r.json())
      .then((d) => {
        const myMetas: MetaOpt[] = [];
        (d.data || []).forEach((v: { metas: MetaOpt[] }) => myMetas.push(...v.metas));
        setMetas(myMetas);
        if (!myMetas.find((m) => m.id === form.metaId)) setForm(f => ({ ...f, metaId: "" }));
      })
      .catch(() => setMetas([]));
  }, [form.projetoId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function changeFilter(key: "filtroUsuarioId" | "periodoInicio" | "periodoFim", value: string) {
    setPage(1);
    if (key === "filtroUsuarioId") setFiltroUsuarioId(value);
    if (key === "periodoInicio") setPeriodoInicio(value);
    if (key === "periodoFim") setPeriodoFim(value);
  }

  function limparFiltros() {
    setPage(1);
    setFiltroUsuarioId("");
    setPeriodoInicio("");
    setPeriodoFim("");
  }

  async function toggleConcluida(a: Atividade) {
    const tentandoConcluir = !a.concluida;
    if (tentandoConcluir && !a.meta) {
      toast("error", "Associe uma meta ao plano de trabalho antes de marcar como concluída");
      return;
    }
    setAtividades(prev => prev.map(x => x.id === a.id ? { ...x, concluida: tentandoConcluir } : x));
    try {
      const res = await fetch(`/api/atividades/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concluida: tentandoConcluir }),
      });
      if (!res.ok) {
        setAtividades(prev => prev.map(x => x.id === a.id ? { ...x, concluida: a.concluida } : x));
        toast("error", "Erro ao atualizar atividade");
      }
    } catch {
      setAtividades(prev => prev.map(x => x.id === a.id ? { ...x, concluida: a.concluida } : x));
      toast("error", "Erro ao atualizar atividade");
    }
  }

  async function confirmarDelete(id: string) {
    try {
      const res = await fetch(`/api/atividades/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("success", "Atividade removida");
        setAtividades(prev => prev.filter(x => x.id !== id));
        setTotal(t => t - 1);
      } else {
        const d = await res.json();
        toast("error", d.error || "Erro ao remover atividade");
      }
    } catch {
      toast("error", "Erro ao remover atividade");
    } finally {
      setDeletingId(null);
    }
  }

  function openCreate() {
    setEditTarget(null);
    setForm({ projetoId: "", metaId: "", titulo: "", descricao: "", dataInicio: "", dataFim: "", concluida: false });
    setUploadedFiles([]);
    setModalOpen(true);
  }

  function openEdit(a: Atividade) {
    setEditTarget(a);
    setForm({
      projetoId: a.projeto.id,
      metaId: a.meta?.id || "",
      titulo: a.titulo,
      descricao: a.descricao || "",
      dataInicio: a.dataInicio ? a.dataInicio.slice(0, 10) : "",
      dataFim: a.dataFim ? a.dataFim.slice(0, 10) : "",
      concluida: a.concluida,
    });
    setUploadedFiles([]);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    if (form.concluida && !form.metaId) {
      toast("error", "Associe uma meta ao plano de trabalho antes de marcar como concluída");
      setSubmitting(false);
      return;
    }

    const payload = { ...form, metaId: form.metaId || null };

    let res: Response;
    if (editTarget) {
      res = await fetch(`/api/atividades/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/atividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    if (!res.ok) { toast("error", data.error || "Erro ao salvar atividade"); setSubmitting(false); return; }

    if (!editTarget && uploadedFiles.length > 0) {
      await fetch(`/api/atividades/${data.id}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentos: uploadedFiles }),
      });
    }

    toast("success", editTarget ? "Atividade atualizada!" : "Atividade registrada com sucesso!");
    setModalOpen(false);
    setForm({ projetoId: "", metaId: "", titulo: "", descricao: "", dataInicio: "", dataFim: "", concluida: false });
    setUploadedFiles([]);
    carregar();
    setSubmitting(false);
  }

  // ── Ações handlers ──────────────────────────────────────────────────

  async function loadAcoes(atividadeId: string) {
    setAcaoLoadingId(atividadeId);
    try {
      const res = await fetch(`/api/atividades/${atividadeId}/acoes`);
      if (res.ok) {
        const data: AcaoAtividade[] = await res.json();
        setAcoesPorAtividade(prev => ({ ...prev, [atividadeId]: data }));
      }
    } catch { /* silently ignore */ }
    finally { setAcaoLoadingId(null); }
  }

  function toggleAcoes(atividadeId: string) {
    setExpandedAcoes(prev => {
      const next = new Set(prev);
      if (next.has(atividadeId)) {
        next.delete(atividadeId);
      } else {
        next.add(atividadeId);
        if (acoesPorAtividade[atividadeId] === undefined) loadAcoes(atividadeId);
      }
      return next;
    });
  }

  function openAcaoModal(atividadeId: string) {
    setAcaoAtividadeId(atividadeId);
    setAcaoForm({ descricao: "", dataOcorrido: new Date().toISOString().slice(0, 10) });
    setAcaoFiles([]);
    setAcaoModalOpen(true);
    // Garante que o painel de ações estará expandido após salvar
    if (acoesPorAtividade[atividadeId] === undefined) loadAcoes(atividadeId);
    setExpandedAcoes(prev => new Set([...prev, atividadeId]));
  }

  async function handleAcaoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acaoAtividadeId) return;
    setAcaoSubmitting(true);

    const res = await fetch(`/api/atividades/${acaoAtividadeId}/acoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...acaoForm, documentos: acaoFiles }),
    });

    if (res.ok) {
      const acao: AcaoAtividade = await res.json();
      setAcoesPorAtividade(prev => ({
        ...prev,
        [acaoAtividadeId]: [...(prev[acaoAtividadeId] || []), acao],
      }));
      toast("success", "Ação registrada!");
      setAcaoModalOpen(false);
      setAcaoFiles([]);
    } else {
      const data = await res.json();
      toast("error", data.error || "Erro ao registrar ação");
    }
    setAcaoSubmitting(false);
  }

  function openEditAcao(atividadeId: string, acao: AcaoAtividade) {
    setEditAcaoAtividadeId(atividadeId);
    setEditAcaoTarget(acao);
    setEditAcaoForm({
      descricao: acao.descricao,
      dataOcorrido: acao.dataOcorrido.slice(0, 10),
    });
    setEditAcaoNewFiles([]);
    setEditAcaoModalOpen(true);
  }

  async function handleEditAcaoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editAcaoTarget || !editAcaoAtividadeId) return;
    setEditAcaoSubmitting(true);
    try {
      const patchRes = await fetch(
        `/api/atividades/${editAcaoAtividadeId}/acoes/${editAcaoTarget.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editAcaoForm),
        }
      );
      if (!patchRes.ok) {
        const d = await patchRes.json();
        toast("error", d.error || "Erro ao salvar ação");
        return;
      }

      if (editAcaoNewFiles.length > 0) {
        await fetch(
          `/api/atividades/${editAcaoAtividadeId}/acoes/${editAcaoTarget.id}/documentos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentos: editAcaoNewFiles }),
          }
        );
      }

      // Reload ações from server to reflect all changes
      await loadAcoes(editAcaoAtividadeId);
      toast("success", "Ação atualizada!");
      setEditAcaoModalOpen(false);
      setEditAcaoNewFiles([]);
    } catch {
      toast("error", "Erro ao atualizar ação");
    } finally {
      setEditAcaoSubmitting(false);
    }
  }

  async function deleteAcaoDoc(atividadeId: string, acaoId: string, docId: string) {
    setDeletingDocId(docId);
    try {
      const res = await fetch(
        `/api/atividades/${atividadeId}/acoes/${acaoId}/documentos?docId=${docId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        // Remove from edit modal state
        setEditAcaoTarget(prev =>
          prev ? { ...prev, documentos: prev.documentos.filter(d => d.id !== docId) } : prev
        );
        // Remove from ações list state
        setAcoesPorAtividade(prev => ({
          ...prev,
          [atividadeId]: (prev[atividadeId] || []).map(a =>
            a.id === acaoId
              ? { ...a, documentos: a.documentos.filter(d => d.id !== docId) }
              : a
          ),
        }));
        toast("success", "Documento removido");
      } else {
        toast("error", "Erro ao remover documento");
      }
    } catch {
      toast("error", "Erro ao remover documento");
    } finally {
      setDeletingDocId(null);
    }
  }

  async function deleteAcao(atividadeId: string, acaoId: string) {
    setAcaoDeletingId(acaoId);
    try {
      const res = await fetch(`/api/atividades/${atividadeId}/acoes/${acaoId}`, { method: "DELETE" });
      if (res.ok) {
        setAcoesPorAtividade(prev => ({
          ...prev,
          [atividadeId]: (prev[atividadeId] || []).filter(a => a.id !== acaoId),
        }));
        toast("success", "Ação removida");
      } else {
        const d = await res.json();
        toast("error", d.error || "Erro ao remover ação");
      }
    } catch {
      toast("error", "Erro ao remover ação");
    } finally {
      setAcaoDeletingId(null);
    }
  }

  const pageSize = 25;
  const totalPages = Math.ceil(total / pageSize);
  const podeExcluir = user?.perfil === "ADMINISTRADOR" || user?.perfil === "MEMBRO";

  return (
    <div className="space-y-5" style={{ marginLeft: '5px' }}>
      <div className="flex items-center justify-between">
        <div style={{ marginLeft: '5px' }}>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Atividades</h1>
          <p className="text-sm text-[var(--text-secondary)]">{total} atividade(s)</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>
          Nova Atividade
        </Button>
      </div>

      {/* Filter bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 space-y-3" style={{ marginLeft: '5px' }}>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Filtros</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {user?.perfil !== "MEMBRO" && (
            <Select
              label="Membro"
              value={filtroUsuarioId}
              onChange={(e) => changeFilter("filtroUsuarioId", e.target.value)}
              options={usuarios.map((u) => ({ value: u.id, label: u.nomeCompleto }))}
              placeholder="Todos os membros"
            />
          )}
          <Input
            label="Período previsto — início"
            type="date"
            value={periodoInicio}
            onChange={(e) => changeFilter("periodoInicio", e.target.value)}
          />
          <Input
            label="Período previsto — fim"
            type="date"
            value={periodoFim}
            onChange={(e) => changeFilter("periodoFim", e.target.value)}
          />
        </div>
        {(filtroUsuarioId || periodoInicio || periodoFim) && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={limparFiltros}>Limpar filtros</Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {atividades.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ marginLeft: '5px' }}>
              <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
                <FileText size={22} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Nenhuma atividade encontrada</p>
              <p className="text-xs text-[var(--text-muted)]">Adicione uma atividade a um projeto para começar</p>
            </div>
          )}
          {atividades.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`border rounded-none p-4 hover:shadow-[0_0_20px_rgba(37,99,235,0.1)] transition-all ${getRowClass(a)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0" style={{ marginLeft: '5px' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-sm font-semibold text-[var(--text-primary)] ${a.concluida ? "line-through text-[var(--text-muted)]" : ""}`}>
                      {a.titulo}
                    </h3>
                    <button
                      onClick={() => toggleConcluida(a)}
                      title={a.concluida ? "Marcar como Em Andamento" : "Marcar como Concluída"}
                      className="transition-opacity hover:opacity-75"
                    >
                      <Badge value={a.concluida ? "CONCLUIDO" : "EM_ANDAMENTO"} />
                    </button>
                  </div>
                  {a.meta && (
                    <p className="text-[11px] text-[var(--accent-primary)] mt-0.5 font-medium">
                      Meta {a.meta.ordem}: {a.meta.descricao}
                    </p>
                  )}
                  {a.descricao && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{a.descricao.slice(0, 200)}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                    <span>{a.projeto.titulo}</span>
                    <span>•</span>
                    <span>{a.usuario.nomeCompleto}</span>
                    {(a.dataInicio || a.dataFim) && (
                      <>
                        <span>•</span>
                        <span className="font-mono">
                          {a.dataInicio ? formatarData(a.dataInicio) : "—"} a {a.dataFim ? formatarData(a.dataFim) : "—"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {a.documentos.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-[var(--accent-secondary)] mr-1">
                      <FileText size={12} />
                      {a.documentos.length}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEdit(a)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Activity size={13} />}
                    onClick={() => openAcaoModal(a.id)}
                    title="Registrar ação realizada"
                    className="text-[var(--accent-primary)] hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    + Ação
                  </Button>
                  {podeExcluir && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={13} />}
                      onClick={() => setDeletingId(a.id)}
                      className="text-[var(--text-muted)] hover:text-red-500"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>

              {/* Ações section */}
              <div className="mt-3 pt-3 border-t border-[var(--border)]/60">
                <button
                  onClick={() => toggleAcoes(a.id)}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors group"
                >
                  <Activity size={12} className="group-hover:text-[var(--accent-primary)]" />
                  <span>
                    {acoesPorAtividade[a.id] !== undefined
                      ? `${acoesPorAtividade[a.id].length} ação(ões) realizadas`
                      : "Ver ações realizadas"}
                  </span>
                  {acaoLoadingId === a.id ? (
                    <div className="w-3 h-3 border border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin ml-1" />
                  ) : (
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${expandedAcoes.has(a.id) ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                <AnimatePresence>
                  {expandedAcoes.has(a.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2">
                        {(acoesPorAtividade[a.id] || []).length === 0 && (
                          <p className="text-xs text-[var(--text-muted)] italic pl-1">
                            Nenhuma ação registrada ainda.
                          </p>
                        )}
                        {(acoesPorAtividade[a.id] || []).map((acao) => (
                          <div
                            key={acao.id}
                            className="bg-[var(--bg-elevated)] border border-[var(--border)]/50 rounded-none p-3 pr-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-[var(--accent-primary)] mb-1">
                                  {formatarData(acao.dataOcorrido)}
                                </p>
                                <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                                  {acao.descricao}
                                </p>
                                {acao.documentos.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2 text-[11px] text-[var(--text-secondary)]">
                                    <FileText size={10} />
                                    <span>{acao.documentos.length} documento(s) anexado(s)</span>
                                    <span className="text-[var(--text-muted)]">
                                      ({acao.documentos.map(d => d.rotulo || d.nomeOriginal).join(", ")})
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0 mr-2">
                                <button
                                  onClick={() => openEditAcao(a.id, acao)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-primary)] transition-colors text-xs"
                                  title="Editar ação"
                                >
                                  <Pencil size={12} />
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => deleteAcao(a.id, acao.id)}
                                  disabled={acaoDeletingId === acao.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40 text-xs"
                                  title="Remover ação"
                                >
                                  {acaoDeletingId === acao.id ? (
                                    <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 size={12} />
                                      <span>Remover</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => openAcaoModal(a.id)}
                          className="flex items-center gap-1.5 text-xs text-[var(--accent-primary)] hover:opacity-80 transition-opacity mt-1 font-medium"
                        >
                          <Plus size={12} />
                          Registrar nova ação
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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

      {/* Atividade modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Editar Atividade" : "Nova Atividade"} size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4" style={{ marginLeft: '5px', marginRight: '5px' }}>
          <Select
            label="Projeto"
            value={form.projetoId}
            onChange={(e) => setForm(f => ({ ...f, projetoId: e.target.value, metaId: "" }))}
            options={projetos.map((p) => ({ value: p.id, label: p.titulo }))}
            placeholder="Selecione um projeto..."
            required
            disabled={!!editTarget}
          />
          {metas.length > 0 && (
            <Select
              label="Meta do Plano de Trabalho (opcional)"
              value={form.metaId}
              onChange={(e) => setForm(f => ({ ...f, metaId: e.target.value }))}
              options={metas.map((m) => ({ value: m.id, label: `Meta ${m.ordem}: ${m.descricao}` }))}
              placeholder="Selecione uma meta..."
            />
          )}
          <Input label="Título" value={form.titulo} onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} required />
          <Textarea
            label="Descrição"
            value={form.descricao}
            onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
            rows={4}
            placeholder="Descreva a atividade realizada..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data de Início" type="date" value={form.dataInicio} onChange={(e) => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
            <Input label="Data de Fim" type="date" value={form.dataFim} onChange={(e) => setForm(f => ({ ...f, dataFim: e.target.value }))} />
          </div>
          {editTarget && (
            <Select
              label="Status"
              value={form.concluida ? "true" : "false"}
              onChange={(e) => setForm(f => ({ ...f, concluida: e.target.value === "true" }))}
              options={[
                { value: "false", label: "Em Andamento" },
                { value: "true", label: "Concluída" },
              ]}
            />
          )}
          {!editTarget && (
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
                Documentos Comprobatórios
              </label>
              <FileUpload onUpload={(files) => setUploadedFiles(f => [...f, ...files])} maxFiles={10} />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>{editTarget ? "Salvar Alterações" : "Registrar Atividade"}</Button>
          </div>
        </form>
      </Modal>

      {/* Editar ação modal */}
      <Modal
        open={editAcaoModalOpen}
        onClose={() => setEditAcaoModalOpen(false)}
        title="Editar Ação Realizada"
        size="lg"
      >
        <form onSubmit={handleEditAcaoSubmit} className="p-6 space-y-4">
          <Input
            label="Data da Ocorrência"
            type="date"
            value={editAcaoForm.dataOcorrido}
            onChange={(e) => setEditAcaoForm(f => ({ ...f, dataOcorrido: e.target.value }))}
            required
          />
          <Textarea
            label="Descrição da Ação"
            value={editAcaoForm.descricao}
            onChange={(e) => setEditAcaoForm(f => ({ ...f, descricao: e.target.value }))}
            rows={6}
            placeholder="Descreva a ação realizada..."
            required
          />

          {/* Documentos existentes */}
          {editAcaoTarget && editAcaoTarget.documentos.length > 0 && (
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
                Documentos anexados
              </label>
              <div className="space-y-1.5">
                {editAcaoTarget.documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={13} className="text-[var(--accent-primary)] shrink-0" />
                      <span className="text-xs text-[var(--text-primary)] truncate">{doc.nomeOriginal}</span>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">{doc.mimeType}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => editAcaoAtividadeId && editAcaoTarget &&
                        deleteAcaoDoc(editAcaoAtividadeId, editAcaoTarget.id, doc.id)}
                      disabled={deletingDocId === doc.id}
                      className="text-[var(--text-muted)] hover:text-red-500 transition-colors shrink-0 disabled:opacity-40"
                      title="Remover documento"
                    >
                      {deletingDocId === doc.id
                        ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Novos documentos */}
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
              Adicionar novos documentos / imagens
            </label>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              Cole imagens com Ctrl+V ou arraste arquivos (PDF, JPG, PNG…).
            </p>
            <FileUpload
              onUpload={(files) => setEditAcaoNewFiles(f => [...f, ...files])}
              maxFiles={20}
            />
            {editAcaoNewFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {editAcaoNewFiles.map((f, i) => (
                  <div key={i} className="border border-[var(--border)] rounded-none p-3 space-y-2 bg-[var(--bg-elevated)]">
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-[var(--accent-primary)] shrink-0" />
                      <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{f.nomeOriginal}</span>
                      <button type="button" onClick={() => setEditAcaoNewFiles(prev => prev.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-red-500 text-sm leading-none">×</button>
                    </div>
                    <Input
                      label="Rótulo (título no relatório)"
                      value={f.rotulo || ""}
                      onChange={(e) => setEditAcaoNewFiles(prev => prev.map((file, j) => j === i ? { ...file, rotulo: e.target.value } : file))}
                      placeholder={f.nomeOriginal}
                    />
                    <Textarea
                      label="Detalhe / legenda"
                      value={f.detalhe || ""}
                      onChange={(e) => setEditAcaoNewFiles(prev => prev.map((file, j) => j === i ? { ...file, detalhe: e.target.value } : file))}
                      rows={2}
                      placeholder="Descreva o conteúdo deste arquivo..."
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditAcaoModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={editAcaoSubmitting} icon={<Pencil size={14} />}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmar exclusão de atividade */}
      <Modal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Remover Atividade"
        size="sm"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-primary)] font-medium">
                Tem certeza que deseja remover esta atividade?
              </p>
              {deletingId && atividades.find(a => a.id === deletingId) && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  &ldquo;{atividades.find(a => a.id === deletingId)!.titulo}&rdquo;
                </p>
              )}
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                Esta ação não pode ser desfeita. Todas as ações e documentos vinculados serão removidos.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button
              variant="danger"
              icon={<Trash2 size={14} />}
              onClick={() => deletingId && confirmarDelete(deletingId)}
            >
              Remover
            </Button>
          </div>
        </div>
      </Modal>

      {/* Nova ação modal */}
      <Modal
        open={acaoModalOpen}
        onClose={() => setAcaoModalOpen(false)}
        title="Registrar Ação Realizada"
        size="lg"
      >
        <form onSubmit={handleAcaoSubmit} className="p-6 space-y-4">
          <Input
            label="Data da Ocorrência"
            type="date"
            value={acaoForm.dataOcorrido}
            onChange={(e) => setAcaoForm(f => ({ ...f, dataOcorrido: e.target.value }))}
            required
          />
          <Textarea
            label="Descrição da Ação"
            value={acaoForm.descricao}
            onChange={(e) => setAcaoForm(f => ({ ...f, descricao: e.target.value }))}
            rows={6}
            placeholder="Descreva detalhadamente a ação realizada (reunião, coleta de dados, visita técnica, etc.)..."
            required
          />
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
              Documentos e Imagens Comprobatórios
            </label>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              Anexe PDFs, imagens (JPG, PNG) ou outros documentos. Você pode colar imagens diretamente (Ctrl+V).
            </p>
            <FileUpload
              onUpload={(files) => setAcaoFiles(f => [...f, ...files])}
              maxFiles={20}
            />
            {acaoFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {acaoFiles.map((f, i) => (
                  <div key={i} className="border border-[var(--border)] rounded-none p-3 space-y-2 bg-[var(--bg-elevated)]">
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-[var(--accent-primary)] shrink-0" />
                      <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{f.nomeOriginal}</span>
                      <button type="button" onClick={() => setAcaoFiles(prev => prev.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-red-500 text-sm leading-none">×</button>
                    </div>
                    <Input
                      label="Rótulo (título no relatório)"
                      value={f.rotulo || ""}
                      onChange={(e) => setAcaoFiles(prev => prev.map((file, j) => j === i ? { ...file, rotulo: e.target.value } : file))}
                      placeholder={f.nomeOriginal}
                    />
                    <Textarea
                      label="Detalhe / legenda"
                      value={f.detalhe || ""}
                      onChange={(e) => setAcaoFiles(prev => prev.map((file, j) => j === i ? { ...file, detalhe: e.target.value } : file))}
                      rows={2}
                      placeholder="Descreva o conteúdo deste arquivo..."
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setAcaoModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={acaoSubmitting} icon={<Activity size={14} />}>
              Registrar Ação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
