"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { FileUpload, UploadedFile } from "@/components/shared/FileUpload";
import { useToast } from "@/components/ui/Toast";
import { formatarData } from "@/lib/utils";

interface Atividade {
  id: string;
  titulo: string;
  descricao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  projeto: { id: string; titulo: string };
  usuario: { nomeCompleto: string };
  documentos: Array<{ id: string; nomeOriginal: string; mimeType: string }>;
}

export default function AtividadesPage() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [projetos, setProjetos] = useState<Array<{ id: string; titulo: string }>>([]);
  const [form, setForm] = useState({ projetoId: "", titulo: "", descricao: "", dataInicio: "", dataFim: "" });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/atividades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) { toast("error", data.error || "Erro ao criar atividade"); setSubmitting(false); return; }

    // Attach uploaded files
    if (uploadedFiles.length > 0) {
      await fetch(`/api/atividades/${data.id}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentos: uploadedFiles }),
      });
    }

    toast("success", "Atividade registrada com sucesso!");
    setModalOpen(false);
    setForm({ projetoId: "", titulo: "", descricao: "", dataInicio: "", dataFim: "" });
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
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
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
                  {a.descricao && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: a.descricao.slice(0, 200) }} />
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                    <span>{a.projeto.titulo}</span>
                    <span>•</span>
                    <span>{a.usuario.nomeCompleto}</span>
                    {a.dataInicio && <><span>•</span><span className="font-mono">{formatarData(a.dataInicio)} a {formatarData(a.dataFim)}</span></>}
                  </div>
                </div>
                {a.documentos.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-[var(--accent-secondary)]">
                    <FileText size={12} />
                    {a.documentos.length}
                  </div>
                )}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Atividade" size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Select
            label="Projeto"
            value={form.projetoId}
            onChange={(e) => setForm(f => ({ ...f, projetoId: e.target.value }))}
            options={projetos.map((p) => ({ value: p.id, label: p.titulo }))}
            placeholder="Selecione um projeto..."
            required
          />
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
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">
              Documentos Comprobatórios
            </label>
            <FileUpload onUpload={(files) => setUploadedFiles(f => [...f, ...files])} maxFiles={10} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Registrar Atividade</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
