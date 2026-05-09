"use client";

import { useState, useEffect } from "react";
import { Database, Shield, CheckCircle, AlertTriangle, RefreshCw, Plus, Terminal } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatarData } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface AuditEntry {
  id: string;
  acao: string;
  entidade: string | null;
  ipAddress: string | null;
  createdAt: string;
  usuario: { nomeCompleto: string; email: string } | null;
}

interface ConfirmModal {
  acao: "CRIAR" | "RECRIAR";
  confirmText: string;
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState({ host: "", porta: "3306", nome: "", usuario: "", senha: "" });
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [testeOk, setTesteOk] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<ConfirmModal | null>(null);
  const [executandoSchema, setExecutandoSchema] = useState(false);
  const [schemaLog, setSchemaLog] = useState<string[]>([]);
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/admin/audit-log?page=${page}`)
      .then((r) => r.json())
      .then((d) => { setLogs(d.data || []); setTotal(d.total || 0); });
  }, [page]);

  useEffect(() => {
    fetch("/api/admin/configuracoes")
      .then((r) => r.json())
      .then((d) => {
        if (d.host) setConfig((c) => ({ ...c, ...d }));
      });
  }, []);

  async function testarConexao() {
    setTestandoConexao(true);
    setTesteOk(null);
    try {
      const res = await fetch("/api/admin/configuracoes/testar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setTesteOk(data.ok === true);
      if (data.ok) toast("success", "Conexão bem-sucedida!");
      else toast("error", data.error || "Falha na conexão");
    } catch {
      setTesteOk(false);
      toast("error", "Erro ao testar conexão");
    } finally {
      setTestandoConexao(false);
    }
  }

  async function salvarConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!testeOk) { toast("warning", "Teste a conexão antes de salvar"); return; }
    setSalvando(true);
    const res = await fetch("/api/admin/configuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSalvando(false);
    if (res.ok) toast("success", "Configurações salvas!");
    else toast("error", "Erro ao salvar");
  }

  function abrirModal(acao: "CRIAR" | "RECRIAR") {
    if (!testeOk) { toast("warning", "Teste a conexão antes de prosseguir"); return; }
    setModal({ acao, confirmText: "" });
    setSchemaLog([]);
  }

  async function executarSchema() {
    if (!modal) return;
    if (modal.acao === "RECRIAR" && modal.confirmText !== "CONFIRMAR") {
      toast("error", 'Digite "CONFIRMAR" para prosseguir');
      return;
    }
    setExecutandoSchema(true);
    setSchemaLog([]);
    try {
      const res = await fetch("/api/admin/configuracoes/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, acao: modal.acao, confirmacao: modal.confirmText }),
      });
      const data = await res.json();
      if (data.executados?.length) setSchemaLog(data.executados);
      if (data.erros?.length) {
        data.erros.forEach((e: string) => toast("error", e.slice(0, 120)));
      }
      if (data.ok) {
        toast("success", modal.acao === "RECRIAR" ? "Tabelas recriadas com sucesso!" : "Tabelas criadas com sucesso!");
        setModal(null);
      } else if (!data.erros?.length) {
        toast("error", data.error || "Erro ao executar schema");
      }
    } catch {
      toast("error", "Erro de comunicação com o servidor");
    } finally {
      setExecutandoSchema(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configurações</h1>
        <p className="text-sm text-[var(--text-secondary)]">Painel administrativo do sistema</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* DB Config */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-[var(--accent-primary)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Configuração do Banco de Dados</h2>
          </div>

          <form onSubmit={salvarConfig} className="space-y-4">
            <Input label="Host / Servidor" value={config.host} onChange={(e) => { setTesteOk(null); setConfig(c => ({ ...c, host: e.target.value })); }} placeholder="localhost" required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Porta" type="number" value={config.porta} onChange={(e) => { setTesteOk(null); setConfig(c => ({ ...c, porta: e.target.value })); }} />
              <Input label="Nome do Banco" value={config.nome} onChange={(e) => { setTesteOk(null); setConfig(c => ({ ...c, nome: e.target.value })); }} required />
            </div>
            <Input label="Usuário" value={config.usuario} onChange={(e) => { setTesteOk(null); setConfig(c => ({ ...c, usuario: e.target.value })); }} required />
            <Input label="Senha" type="password" value={config.senha} onChange={(e) => { setTesteOk(null); setConfig(c => ({ ...c, senha: e.target.value })); }} />

            <div className="flex items-center gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={testarConexao} loading={testandoConexao}>
                Testar Conexão
              </Button>
              {testeOk === true && <span className="flex items-center gap-1 text-emerald-400 text-sm"><CheckCircle size={14} />Conectado</span>}
              {testeOk === false && <span className="text-red-400 text-sm">Falha na conexão</span>}
            </div>

            <Button type="submit" loading={salvando} className="w-full">Salvar Configurações</Button>
          </form>

          {/* Schema management */}
          <div className="border-t border-[var(--border)] pt-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Terminal size={16} className="text-[var(--accent-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Gerenciamento do Esquema</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Cria ou recria as tabelas do sistema no banco configurado acima. Teste a conexão antes de prosseguir.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => abrirModal("CRIAR")}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                Criar Tabelas
              </Button>
              <Button
                type="button"
                onClick={() => abrirModal("RECRIAR")}
                className="flex-1 flex items-center justify-center gap-2 !bg-red-600/20 !border-red-600/40 !text-red-400 hover:!bg-red-600/30"
              >
                <RefreshCw size={14} />
                Recriar Tabelas
              </Button>
            </div>
            <p className="text-xs text-amber-400/80 flex items-start gap-1.5">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span><strong>Recriar</strong> apaga todas as tabelas e dados existentes. Esta operação é irreversível.</span>
            </p>
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--border)]">
            <Shield size={18} className="text-[var(--accent-secondary)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Log de Auditoria</h2>
            <span className="ml-auto text-xs text-[var(--text-secondary)]">{total} registros</span>
          </div>
          <div className="overflow-y-auto max-h-80 divide-y divide-[var(--border)]">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-2.5 hover:bg-[var(--bg-elevated)] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{log.acao}</span>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">{formatarData(log.createdAt)}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {log.usuario?.nomeCompleto || "Sistema"} • {log.entidade || "—"} • {log.ipAddress || "—"}
                </p>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="px-6 py-8 text-center text-xs text-[var(--text-secondary)]">Nenhum registro encontrado</p>
            )}
          </div>
          <div className="flex gap-2 px-4 py-3 border-t border-[var(--border)]">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget && !executandoSchema) setModal(null); }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${modal.acao === "RECRIAR" ? "bg-red-500/15" : "bg-blue-500/15"}`}>
                  {modal.acao === "RECRIAR"
                    ? <AlertTriangle size={20} className="text-red-400" />
                    : <Plus size={20} className="text-[var(--accent-primary)]" />
                  }
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {modal.acao === "RECRIAR" ? "Recriar todas as tabelas" : "Criar tabelas do sistema"}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {modal.acao === "RECRIAR"
                      ? `Banco: ${config.nome} em ${config.host}`
                      : `Serão criadas apenas as tabelas que ainda não existem em ${config.nome}.`
                    }
                  </p>
                </div>
              </div>

              {/* Warning for RECRIAR */}
              {modal.acao === "RECRIAR" && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <AlertTriangle size={15} />
                    ATENÇÃO — Esta ação é irreversível
                  </p>
                  <ul className="text-xs text-red-300/90 space-y-1 list-disc list-inside">
                    <li>Todas as tabelas serão <strong>apagadas</strong> (DROP TABLE)</li>
                    <li>Todos os dados de usuários, projetos e atividades serão <strong>perdidos permanentemente</strong></li>
                    <li>Não existe backup automático — certifique-se de ter exportado os dados antes</li>
                    <li>Não há como desfazer esta operação</li>
                  </ul>
                </div>
              )}

              {/* Confirmation input for RECRIAR */}
              {modal.acao === "RECRIAR" && (
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-secondary)]">
                    Para confirmar, digite <strong className="text-red-400">CONFIRMAR</strong> abaixo:
                  </label>
                  <input
                    type="text"
                    value={modal.confirmText}
                    onChange={(e) => setModal((m) => m ? { ...m, confirmText: e.target.value } : null)}
                    placeholder="CONFIRMAR"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-red-500 transition-colors"
                    autoFocus
                  />
                </div>
              )}

              {/* Schema log during execution */}
              {schemaLog.length > 0 && (
                <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3 max-h-40 overflow-y-auto">
                  {schemaLog.map((line, i) => (
                    <p key={i} className={`text-xs font-mono leading-5 ${line.startsWith("OK") ? "text-emerald-400" : line.startsWith("DROP") ? "text-amber-400" : line.startsWith("SKIP") ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}`}>
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setModal(null)}
                  disabled={executandoSchema}
                >
                  Cancelar
                </Button>
                <Button
                  className={`flex-1 ${modal.acao === "RECRIAR" ? "!bg-red-600 hover:!bg-red-700 !text-white !border-red-600" : ""}`}
                  onClick={executarSchema}
                  loading={executandoSchema}
                  disabled={modal.acao === "RECRIAR" && modal.confirmText !== "CONFIRMAR"}
                >
                  {modal.acao === "RECRIAR" ? "Recriar Tabelas" : "Criar Tabelas"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
