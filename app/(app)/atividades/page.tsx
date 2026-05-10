"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, FileText, Pencil } from "lucide-react";
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
  projeto: { id: string; titulo: string };
  usuario: { nomeCompleto: string };
  meta: { id: string; descricao: string; ordem: number } | null;
  documentos: Array<{ id: string; nomeOriginal: string; mimeType: string }>;
}

interface MetaOpt {
  id: string;
  descricao: string;
  ordem: number;
}

export default function AtividadesPage() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Atividade | null>(null);
  const [projetos, setProjetos] = useState<Array<{ id: string; titulo: string }>>([]);
  const [metas, setMetas] = useState<MetaOpt[]>([]);
  const [form, setForm] = useState({ projetoId: "", metaId: "", titulo: "", descricao: "", dataInicio: "", dataFim: "" });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { user } = useAuth();

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/atividades?page=${page}`);
      const data = await res.json();
      setAtividades(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setAtividades([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    fetch("/api/projetos?pageSize=100")
      .then((r) => r.json())
      .then((d) => setProjetos(d.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.projetoId || !user?.id) { setMetas([]); return; }
    // Load only the current user's metas for their binding in this project
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

    // Attach uploaded files only on create
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
              <p className="text-sm font-medium text-[var(--text-secondary)]">Nenhuma atividade registrada</p>
              <p className="text-xs text-[var(--text-muted)]">Adicione uma atividade a um projeto para começar</p>
            </div>
          )}
          {atividades.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 hover:shadow-[0_0_20px_rgba(37,99,235,0.1)] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0" style={{ marginLeft: '5px' }}>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{a.titulo}</h3>
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
                    {a.dataInicio && <><span>•</span><span className="font-mono">{formatarData(a.dataInicio)} a {formatarData(a.dataFim)}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.documentos.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-[var(--accent-secondary)]">
                      <FileText size={12} />
                      {a.documentos.length}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEdit(a)}>
                    Editar
                  </Button>
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
