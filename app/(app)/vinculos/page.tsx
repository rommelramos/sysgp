"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatarData } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Meta {
  id: string;
  descricao: string;
  ordem: number;
}

interface Vinculo {
  id: string;
  funcao: string | null;
  isCoordenador: boolean;
  isBolsista: boolean;
  valorBolsa: number | null;
  duracaoMeses: number | null;
  dataInicioBolsa: string | null;
  dataFimBolsa: string | null;
  cargaHoraria: number | null;
  resultadosEsperados: string | null;
  cronograma: string | null;
  statusVinculo: string;
  createdAt: string;
  projeto: { id: string; titulo: string; status: string };
  usuario: { id: string; nomeCompleto: string; email: string; perfil: string };
  metas: Meta[];
}

const statusVinculoOpts = [
  { value: "ATIVO", label: "Ativo" },
  { value: "ENCERRADO", label: "Encerrado" },
  { value: "SUSPENSO", label: "Suspenso" },
];

const blankForm = {
  projetoId: "",
  usuarioId: "",
  funcao: "",
  isCoordenador: false,
  isBolsista: false,
  valorBolsa: "",
  duracaoMeses: "",
  dataInicioBolsa: "",
  dataFimBolsa: "",
  cargaHoraria: "",
  resultadosEsperados: "",
  cronograma: "",
  statusVinculo: "ATIVO",
};

export default function VinculosPage() {
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vinculo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vinculo | null>(null);
  const [form, setForm] = useState(blankForm);
  const [metas, setMetas] = useState<{ descricao: string }[]>([]);
  const [projetos, setProjetos] = useState<Array<{ id: string; titulo: string }>>([]);
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nomeCompleto: string; email: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toast = useToast();
  const { user } = useAuth();

  const isAdmin = user?.perfil === "ADMINISTRADOR";

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vinculos?page=${page}`);
      const data = await res.json();
      setVinculos(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setVinculos([]);
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
    fetch("/api/usuarios?pageSize=200")
      .then((r) => r.json())
      .then((d) => setUsuarios(d.data || []))
      .catch(() => {});
  }, []);

  function openCreate() {
    setEditTarget(null);
    setForm(blankForm);
    setMetas([]);
    setModalOpen(true);
  }

  function openEdit(v: Vinculo) {
    setEditTarget(v);
    setForm({
      projetoId: v.projeto.id,
      usuarioId: v.usuario.id,
      funcao: v.funcao || "",
      isCoordenador: v.isCoordenador,
      isBolsista: v.isBolsista,
      valorBolsa: v.valorBolsa != null ? String(v.valorBolsa) : "",
      duracaoMeses: v.duracaoMeses != null ? String(v.duracaoMeses) : "",
      dataInicioBolsa: v.dataInicioBolsa ? v.dataInicioBolsa.slice(0, 10) : "",
      dataFimBolsa: v.dataFimBolsa ? v.dataFimBolsa.slice(0, 10) : "",
      cargaHoraria: v.cargaHoraria != null ? String(v.cargaHoraria) : "",
      resultadosEsperados: v.resultadosEsperados || "",
      cronograma: v.cronograma || "",
      statusVinculo: v.statusVinculo,
    });
    setMetas(v.metas.map((m) => ({ descricao: m.descricao })));
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        duracaoMeses: form.duracaoMeses ? parseInt(form.duracaoMeses) : null,
        cargaHoraria: form.cargaHoraria ? parseInt(form.cargaHoraria) : null,
        valorBolsa: form.valorBolsa || null,
        dataInicioBolsa: form.dataInicioBolsa || null,
        dataFimBolsa: form.dataFimBolsa || null,
        resultadosEsperados: form.resultadosEsperados || null,
        cronograma: form.cronograma || null,
        metas: metas.filter((m) => m.descricao.trim()),
      };

      let res: Response;
      if (editTarget) {
        res = await fetch(`/api/vinculos/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/vinculos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) { toast("error", data.error || "Erro ao salvar vínculo"); return; }
      toast("success", editTarget ? "Vínculo atualizado!" : "Vínculo criado com sucesso!");
      setModalOpen(false);
      carregar();
    } catch {
      toast("error", "Erro de comunicação com o servidor");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vinculos/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); toast("error", d.error || "Erro ao excluir"); return; }
      toast("success", "Vínculo excluído");
      setDeleteTarget(null);
      carregar();
    } catch {
      toast("error", "Erro de comunicação com o servidor");
    } finally {
      setDeleting(false);
    }
  }

  function addMeta() { setMetas((m) => [...m, { descricao: "" }]); }
  function removeMeta(i: number) { setMetas((m) => m.filter((_, idx) => idx !== i)); }
  function updateMeta(i: number, val: string) {
    setMetas((m) => m.map((meta, idx) => idx === i ? { ...meta, descricao: val } : meta));
  }

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5" style={{ marginLeft: '5px' }}>
      <div className="flex items-center justify-between">
        <div style={{ marginLeft: '5px' }}>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Vínculos</h1>
          <p className="text-sm text-[var(--text-secondary)]">{total} vínculo(s) encontrado(s)</p>
        </div>
        {!user || user.perfil === "MEMBRO" ? null : (
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            Novo Vínculo
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vinculos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ marginLeft: '5px' }}>
          <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center" style={{ marginLeft: '5px' }}>
            <Users size={22} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Nenhum vínculo encontrado</p>
          <p className="text-xs text-[var(--text-muted)]">Crie um vínculo para associar membros a projetos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vinculos.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden"
            >
              {/* Header row */}
              <div className="flex items-center gap-4 p-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0" style={{ marginLeft: '5px' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{v.usuario.nomeCompleto}</span>
                    {v.isCoordenador && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-wide">Coord.</span>
                    )}
                    {v.isBolsista && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 uppercase tracking-wide">Bolsista</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {v.projeto.titulo}
                    {v.funcao && ` · ${v.funcao}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge value={v.statusVinculo} />
                  <button
                    onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                    aria-label={expandedId === v.id ? "Recolher detalhes" : "Ver detalhes"}
                  >
                    <BookOpen size={13} />
                    {v.metas.length > 0 && <span>{v.metas.length} metas</span>}
                  </button>
                  {!user || user.perfil === "MEMBRO" ? null : (
                    <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEdit(v)}>
                      Editar
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => setDeleteTarget(v)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Excluir
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === v.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-[var(--border)] px-4 py-4 bg-[var(--bg-elevated)] space-y-4"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {v.cargaHoraria && (
                      <div style={{ marginLeft: '5px' }}>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">Carga Horária</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{v.cargaHoraria}h/sem</p>
                      </div>
                    )}
                    {v.valorBolsa && (
                      <div style={{ marginLeft: '5px' }}>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">Valor Bolsa</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">R$ {Number(v.valorBolsa).toFixed(2)}</p>
                      </div>
                    )}
                    {v.duracaoMeses && (
                      <div style={{ marginLeft: '5px' }}>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">Duração</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{v.duracaoMeses} meses</p>
                      </div>
                    )}
                    {(v.dataInicioBolsa || v.dataFimBolsa) && (
                      <div style={{ marginLeft: '5px' }}>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold">Período Bolsa</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {formatarData(v.dataInicioBolsa)} — {formatarData(v.dataFimBolsa)}
                        </p>
                      </div>
                    )}
                  </div>

                  {v.resultadosEsperados && (
                    <div style={{ marginLeft: '5px' }}>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-1">Resultados Esperados</p>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{v.resultadosEsperados}</p>
                    </div>
                  )}

                  {v.cronograma && (
                    <div style={{ marginLeft: '5px' }}>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-1">Cronograma</p>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{v.cronograma}</p>
                    </div>
                  )}

                  {v.metas.length > 0 && (
                    <div style={{ marginLeft: '5px' }}>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-2">Metas do Plano de Trabalho</p>
                      <ol className="space-y-1.5">
                        {v.metas.map((m) => (
                          <li key={m.id} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{m.ordem}</span>
                            <span>{m.descricao}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <p className="text-[11px] text-[var(--text-muted)] mt-1" style={{ marginLeft: '5px' }}>
                    Vinculado em {formatarData(v.createdAt)}
                  </p>
                </motion.div>
              )}
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

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Editar Vínculo" : "Novo Vínculo"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5" style={{ marginLeft: '5px', marginRight: '5px' }}>
          {/* Projeto + Usuário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Projeto"
              value={form.projetoId}
              onChange={(e) => setForm(f => ({ ...f, projetoId: e.target.value }))}
              options={projetos.map((p) => ({ value: p.id, label: p.titulo }))}
              placeholder="Selecione o projeto..."
              required
              disabled={!!editTarget}
            />
            <Select
              label="Membro"
              value={form.usuarioId}
              onChange={(e) => setForm(f => ({ ...f, usuarioId: e.target.value }))}
              options={usuarios.map((u) => ({ value: u.id, label: `${u.nomeCompleto} (${u.email})` }))}
              placeholder="Selecione o membro..."
              required
              disabled={!!editTarget}
            />
          </div>

          {/* Função + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Função / Cargo no Projeto"
              value={form.funcao}
              onChange={(e) => setForm(f => ({ ...f, funcao: e.target.value }))}
              placeholder="Ex: Pesquisador Principal, Bolsista IC..."
            />
            <Select
              label="Status do Vínculo"
              value={form.statusVinculo}
              onChange={(e) => setForm(f => ({ ...f, statusVinculo: e.target.value }))}
              options={statusVinculoOpts}
            />
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isCoordenador}
                onChange={(e) => setForm(f => ({ ...f, isCoordenador: e.target.checked }))}
                className="w-4 h-4 rounded border-[var(--border)] accent-[var(--accent-primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]">É coordenador do projeto</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isBolsista}
                onChange={(e) => setForm(f => ({ ...f, isBolsista: e.target.checked }))}
                className="w-4 h-4 rounded border-[var(--border)] accent-[var(--accent-primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]">É bolsista</span>
            </label>
          </div>

          {/* Bolsa fields */}
          {form.isBolsista && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
              <Input
                label="Valor da Bolsa (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.valorBolsa}
                onChange={(e) => setForm(f => ({ ...f, valorBolsa: e.target.value }))}
                placeholder="0,00"
              />
              <Input
                label="Duração (meses)"
                type="number"
                min="1"
                value={form.duracaoMeses}
                onChange={(e) => setForm(f => ({ ...f, duracaoMeses: e.target.value }))}
              />
              <Input
                label="Início da Bolsa"
                type="date"
                value={form.dataInicioBolsa}
                onChange={(e) => setForm(f => ({ ...f, dataInicioBolsa: e.target.value }))}
              />
              <Input
                label="Fim da Bolsa"
                type="date"
                value={form.dataFimBolsa}
                onChange={(e) => setForm(f => ({ ...f, dataFimBolsa: e.target.value }))}
              />
            </div>
          )}

          {/* Carga Horária */}
          <Input
            label="Carga Horária (horas/semana)"
            type="number"
            min="1"
            max="40"
            value={form.cargaHoraria}
            onChange={(e) => setForm(f => ({ ...f, cargaHoraria: e.target.value }))}
            placeholder="Ex: 20"
          />

          {/* Resultados Esperados */}
          <Textarea
            label="Resultados Esperados"
            value={form.resultadosEsperados}
            onChange={(e) => setForm(f => ({ ...f, resultadosEsperados: e.target.value }))}
            rows={3}
            placeholder="Descreva os resultados esperados com este membro no projeto..."
          />

          {/* Cronograma */}
          <Textarea
            label="Cronograma de Atividades"
            value={form.cronograma}
            onChange={(e) => setForm(f => ({ ...f, cronograma: e.target.value }))}
            rows={3}
            placeholder="Descreva o cronograma previsto (mês a mês, trimestral, etc.)..."
          />

          {/* Metas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Metas do Plano de Trabalho
              </label>
              <Button type="button" variant="ghost" size="sm" icon={<Plus size={13} />} onClick={addMeta}>
                Adicionar Meta
              </Button>
            </div>
            {metas.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-2" style={{ marginLeft: '5px' }}>
                Nenhuma meta definida. Clique em &quot;Adicionar Meta&quot; para começar.
              </p>
            ) : (
              <div className="space-y-2">
                {metas.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <input
                      value={m.descricao}
                      onChange={(e) => updateMeta(i, e.target.value)}
                      placeholder={`Meta ${i + 1}...`}
                      className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => removeMeta(i)}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label={`Remover meta ${i + 1}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>
              {editTarget ? "Salvar Alterações" : "Criar Vínculo"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Excluir Vínculo" size="sm">
        <div className="p-6 space-y-4" style={{ marginLeft: '5px', marginRight: '5px' }}>
          <p className="text-sm text-[var(--text-secondary)]">
            Tem certeza que deseja excluir o vínculo de{" "}
            <strong className="text-[var(--text-primary)]">{deleteTarget?.usuario.nomeCompleto}</strong>{" "}
            no projeto <strong className="text-[var(--text-primary)]">{deleteTarget?.projeto.titulo}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button
              onClick={handleDelete}
              loading={deleting}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
