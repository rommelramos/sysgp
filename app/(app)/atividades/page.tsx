"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, FileText, Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";
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

  // Modal / form
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Atividade | null>(null);
  const [projetos, setProjetos] = useState<Array<{ id: string; titulo: string }>>([]);
  const [metas, setMetas] = useState<MetaOpt[]>([]);
  const [form, setForm] = useState({ projetoId: "", metaId: "", titulo: "", descricao: "", dataInicio: "", dataFim: "" });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    // MEMBRO: no user filter dropdown needed
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
    setForm({ projetoId: "", metaId: "", titulo: "", descricao: "", dataInicio: "", dataFim: "" });
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
    });
    setUploadedFiles([]);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
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
    setForm({ projetoId: "", metaId: "", titulo: "", descricao: "", dataInicio: "", dataFim: "" });
    setUploadedFiles([]);
    carregar();
    setSubmitting(false);
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
              <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center" style={{ marginLeft: '5px' }}>
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
              className={`border rounded-xl p-4 hover:shadow-[0_0_20px_rgba(37,99,235,0.1)] transition-all ${getRowClass(a)}`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Concluida toggle */}
                <button
                  onClick={() => toggleConcluida(a)}
                  className="mt-0.5 shrink-0 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                  title={a.concluida ? "Marcar como em andamento" : "Marcar como concluída"}
                >
                  {a.concluida
                    ? <CheckCircle2 size={20} className="text-green-500" />
                    : <Circle size={20} />
                  }
                </button>

                <div className="flex-1 min-w-0" style={{ marginLeft: '5px' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-sm font-semibold text-[var(--text-primary)] ${a.concluida ? "line-through text-[var(--text-muted)]" : ""}`}>
                      {a.titulo}
                    </h3>
                    {a.concluida && (
                      <Badge value="CONCLUIDO" />
                    )}
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
                  {podeExcluir && (
                    deletingId === a.id ? (
                      <div className="flex items-center gap-1">
                        <Button variant="danger" size="sm" onClick={() => confirmarDelete(a.id)}>Confirmar</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={13} />}
                        onClick={() => setDeletingId(a.id)}
                        className="text-[var(--text-muted)] hover:text-red-500"
                      />
                    )
                  )}
                </div>
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
    </div>
  );
}
