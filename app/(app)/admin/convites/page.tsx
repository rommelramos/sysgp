"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Copy, Check, Link2, ToggleLeft, ToggleRight, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatarData } from "@/lib/utils";

interface UsuarioCadastrado {
  id: string;
  nomeCompleto: string;
  confirmado: boolean;
  createdAt: string;
}

interface Convite {
  id: string;
  token: string;
  descricao: string | null;
  usoMaximo: number;
  usoAtual: number;
  expiraEm: string | null;
  ativo: boolean;
  createdAt: string;
  criadoPor: { id: string; nomeCompleto: string };
  usuarios: UsuarioCadastrado[];
}

export default function ConvitesPage() {
  const [convites, setConvites] = useState<Convite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ descricao: "", usoMaximo: "1", expiraEm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const toast = useToast();

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/convites");
      const data = await res.json();
      setConvites(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setConvites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/convites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: form.descricao || undefined,
          usoMaximo: parseInt(form.usoMaximo) || 1,
          expiraEm: form.expiraEm || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast("error", data.error || "Erro ao criar convite"); return; }
      toast("success", "Convite criado com sucesso!");
      setModalOpen(false);
      setForm({ descricao: "", usoMaximo: "1", expiraEm: "" });
      carregar();
    } catch {
      toast("error", "Erro de comunicação com o servidor");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAtivo(convite: Convite) {
    await fetch(`/api/convites?id=${convite.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !convite.ativo }),
    });
    toast("success", convite.ativo ? "Convite desativado" : "Convite ativado");
    carregar();
  }

  function getLink(token: string) {
    return `${window.location.origin}/cadastro/${token}`;
  }

  async function copiar(convite: Convite) {
    await navigator.clipboard.writeText(getLink(convite.token));
    setCopiedId(convite.id);
    toast("success", "Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  const vencido = (c: Convite) => !!c.expiraEm && new Date(c.expiraEm) < new Date();
  const esgotado = (c: Convite) => c.usoAtual >= c.usoMaximo;

  return (
    <div className="space-y-5" style={{ marginLeft: '5px' }}>
      <div className="flex items-center justify-between">
        <div style={{ marginLeft: '5px' }}>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Convites de Cadastro</h1>
          <p className="text-sm text-[var(--text-secondary)]">{total} convite(s) criado(s)</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          Novo Convite
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : convites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ marginLeft: '5px' }}>
          <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
            <Link2 size={22} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Nenhum convite criado</p>
          <p className="text-xs text-[var(--text-muted)]">Crie um link para que pesquisadores se cadastrem</p>
        </div>
      ) : (
        <div className="space-y-3">
          {convites.map((c, i) => {
            const expirado = vencido(c);
            const lotado = esgotado(c);
            const invalido = expirado || lotado || !c.ativo;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`bg-[var(--bg-surface)] border rounded-xl p-4 ${invalido ? "border-[var(--border)] opacity-60" : "border-[var(--border)] shadow-[var(--shadow-card)]"}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${invalido ? "bg-gray-100" : "bg-blue-100"}`}>
                    <Link2 size={16} className={invalido ? "text-gray-400" : "text-blue-600"} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2" style={{ marginLeft: '5px' }}>
                    {/* Title + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {c.descricao || "Convite sem descrição"}
                      </span>
                      {!c.ativo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold uppercase">Desativado</span>}
                      {c.ativo && expirado && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-semibold uppercase">Expirado</span>}
                      {c.ativo && !expirado && lotado && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-semibold uppercase">Esgotado</span>}
                      {c.ativo && !expirado && !lotado && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold uppercase">Ativo</span>}
                    </div>

                    {/* Token URL */}
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-1 rounded-lg truncate flex-1 max-w-xs">
                        /cadastro/{c.token.slice(0, 16)}…
                      </code>
                      <button
                        onClick={() => copiar(c)}
                        className="flex items-center gap-1 text-[11px] text-[var(--accent-primary)] hover:text-blue-700 font-medium"
                      >
                        {copiedId === c.id ? <Check size={13} /> : <Copy size={13} />}
                        {copiedId === c.id ? "Copiado" : "Copiar link"}
                      </button>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
                      <span>
                        <strong className="text-[var(--text-primary)]">{c.usoAtual}</strong>/{c.usoMaximo} usos
                      </span>
                      {c.expiraEm && (
                        <span>Expira em <strong className={expirado ? "text-red-500" : "text-[var(--text-primary)]"}>{formatarData(c.expiraEm)}</strong></span>
                      )}
                      <span>Criado por <strong className="text-[var(--text-primary)]">{c.criadoPor.nomeCompleto}</strong></span>
                      <span>{formatarData(c.createdAt)}</span>
                    </div>

                    {/* Registered users */}
                    {c.usuarios.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border)] mt-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Users size={12} className="text-[var(--text-muted)]" />
                          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Cadastros</span>
                        </div>
                        <div className="space-y-1">
                          {c.usuarios.map((u) => (
                            <div key={u.id} className="flex items-center gap-2 text-xs">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${u.confirmado ? "bg-green-500" : "bg-amber-400"}`} />
                              <span className="text-[var(--text-primary)]">{u.nomeCompleto}</span>
                              <span className="text-[var(--text-muted)]">
                                {u.confirmado ? "Confirmado" : "Aguardando confirmação"}
                              </span>
                              <span className="text-[var(--text-muted)] ml-auto">{formatarData(u.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleAtivo(c)}
                    className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                    aria-label={c.ativo ? "Desativar convite" : "Ativar convite"}
                  >
                    {c.ativo ? <ToggleRight size={24} className="text-[var(--accent-primary)]" /> : <ToggleLeft size={24} />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Convite de Cadastro" size="md">
        <form onSubmit={handleSubmit} className="p-6 space-y-4" style={{ marginLeft: '5px', marginRight: '5px' }}>
          <Input
            label="Descrição (opcional)"
            value={form.descricao}
            onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Ex: Convite para pesquisadores do laboratório X"
          />
          <Input
            label="Limite de usos"
            type="number"
            min="1"
            max="100"
            value={form.usoMaximo}
            onChange={(e) => setForm(f => ({ ...f, usoMaximo: e.target.value }))}
          />
          <Input
            label="Validade (opcional)"
            type="date"
            value={form.expiraEm}
            onChange={(e) => setForm(f => ({ ...f, expiraEm: e.target.value }))}
          />
          <p className="text-xs text-[var(--text-muted)]" style={{ marginLeft: '5px' }}>
            O link gerado pode ser compartilhado com pesquisadores. Cada cadastro feito pelo link
            ficará como &quot;Aguardando confirmação&quot; até o administrador aprovar.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Gerar Link</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
