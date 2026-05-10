"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, Shield, CheckCircle, AlertTriangle,
  RefreshCw, Plus, Terminal, Link2, KeyRound,
  Eye, EyeOff, Loader2, Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatarData } from "@/lib/utils";

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
  /* ── Conexão ──────────────────────────────────────────────────── */
  const [url, setUrl] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);   // DB_PASSWORD está configurado no servidor?
  const [testando, setTestando] = useState(false);
  const [testeOk, setTesteOk] = useState<boolean | null>(null);
  const [testeMsg, setTesteMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  /* ── Schema ───────────────────────────────────────────────────── */
  const [modal, setModal] = useState<ConfirmModal | null>(null);
  const [executandoSchema, setExecutandoSchema] = useState(false);
  const [schemaLog, setSchemaLog] = useState<string[]>([]);

  /* ── Auditoria ────────────────────────────────────────────────── */
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const toast = useToast();

  /* Carrega config atual */
  useEffect(() => {
    fetch("/api/admin/configuracoes")
      .then((r) => r.json())
      .then((d) => {
        if (d.url) setUrl(d.url);
        setHasPassword(d.hasPassword ?? false);
      })
      .catch(() => {});
  }, []);

  /* Carrega auditoria */
  useEffect(() => {
    setLoadingLogs(true);
    fetch(`/api/admin/audit-log?page=${page}`)
      .then((r) => r.json())
      .then((d) => { setLogs(d.data || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, [page]);

  /* Invalida teste se URL ou senha mudar */
  function handleUrlChange(v: string) { setUrl(v); setTesteOk(null); setTesteMsg(""); }
  function handleSenhaChange(v: string) { setSenha(v); setTesteOk(null); setTesteMsg(""); }

  /* Testa conexão */
  async function testarConexao() {
    setTestando(true);
    setTesteOk(null);
    setTesteMsg("");
    try {
      const res = await fetch("/api/admin/configuracoes/testar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, senha }),
      });
      const data = await res.json();
      setTesteOk(data.ok === true);
      setTesteMsg(data.ok ? "Conexão bem-sucedida" : (data.error ?? "Falha na conexão"));
      if (data.ok) toast("success", "Conexão bem-sucedida!");
      else toast("error", data.error ?? "Falha na conexão");
    } catch {
      setTesteOk(false);
      setTesteMsg("Erro ao comunicar com o servidor");
      toast("error", "Erro ao testar conexão");
    } finally {
      setTestando(false);
    }
  }

  /* Salva URL (sem senha) */
  async function salvarUrl() {
    setSalvando(true);
    const res = await fetch("/api/admin/configuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    setSalvando(false);
    if (res.ok) toast("success", "String de conexão salva!");
    else toast("error", "Erro ao salvar");
  }

  /* Abre modal de schema */
  function abrirModal(acao: "CRIAR" | "RECRIAR") {
    if (!testeOk) { toast("warning", "Teste a conexão antes de prosseguir"); return; }
    setModal({ acao, confirmText: "" });
    setSchemaLog([]);
  }

  /* Executa DDL */
  async function executarSchema() {
    if (!modal) return;
    if (modal.acao === "RECRIAR" && modal.confirmText !== "CONFIRMAR") {
      toast("error", 'Digite "CONFIRMAR" para prosseguir'); return;
    }
    setExecutandoSchema(true);
    setSchemaLog([]);
    try {
      const res = await fetch("/api/admin/configuracoes/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: modal.acao, url, senha, confirmacao: modal.confirmText }),
      });
      const data = await res.json();
      if (data.executados?.length) setSchemaLog(data.executados);
      if (data.erros?.length) data.erros.forEach((e: string) => toast("error", e.slice(0, 120)));
      if (data.ok) {
        toast("success", modal.acao === "RECRIAR" ? "Tabelas recriadas!" : "Tabelas criadas!");
        setModal(null);
      } else if (!data.erros?.length) {
        toast("error", data.error ?? "Erro ao executar schema");
      }
    } catch {
      toast("error", "Erro de comunicação");
    } finally {
      setExecutandoSchema(false);
    }
  }

  return (
    <div className="space-y-6 pb-4" style={{ marginLeft: '5px' }}>
      <div style={{ marginLeft: '5px' }}>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configurações</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Painel administrativo do sistema</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ── Conexão com o Banco ─────────────────────────────────── */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[14px] shadow-[var(--shadow-card)]">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[var(--border)]" style={{ marginLeft: '5px' }}>
            <div className="w-7 h-7 rounded-[8px] bg-[var(--accent-primary)]/10 flex items-center justify-center">
              <Database size={14} className="text-[var(--accent-primary)]" />
            </div>
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
              Conexão com o Banco de Dados
            </h2>
          </div>

          <div className="p-6 space-y-5">

            {/* String de conexão */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-widest uppercase flex items-center gap-1.5">
                <Link2 size={11} />
                String de Conexão
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="mysql://usuario@host:3306/nome_do_banco"
                spellCheck={false}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[10px] px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)] transition-all"
              />
              <p className="text-[11px] text-[var(--text-muted)] flex items-start gap-1.5">
                <Info size={11} className="shrink-0 mt-0.5" />
                Não inclua a senha na URL. Use o campo abaixo.
              </p>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-widest uppercase flex items-center gap-1.5">
                <KeyRound size={11} />
                Senha do Banco
                {hasPassword && (
                  <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5 normal-case tracking-normal">
                    configurada via env
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => handleSenhaChange(e.target.value)}
                  placeholder={hasPassword ? "Deixe em branco para usar DB_PASSWORD do servidor" : "Senha do banco de dados"}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[10px] pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                >
                  {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] flex items-start gap-1.5">
                <Info size={11} className="shrink-0 mt-0.5" />
                A senha <strong>nunca</strong> é salva no banco de dados — use a variável de ambiente{" "}
                <code className="text-[var(--accent-secondary)] font-mono">DB_PASSWORD</code> no servidor.
              </p>
            </div>

            {/* Testar + status */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={testarConexao}
                loading={testando}
                icon={<Database size={13} />}
              >
                Testar Conexão
              </Button>

              <AnimatePresence mode="wait">
                {testando && (
                  <motion.span key="testing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-[12px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> Conectando…
                  </motion.span>
                )}
                {!testando && testeOk === true && (
                  <motion.span key="ok" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="text-[12px] text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle size={13} /> {testeMsg}
                  </motion.span>
                )}
                {!testando && testeOk === false && (
                  <motion.span key="err" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="text-[12px] text-red-400 flex items-center gap-1.5 max-w-xs truncate" title={testeMsg}>
                    <AlertTriangle size={13} className="shrink-0" /> {testeMsg}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Salvar URL */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={salvando}
              onClick={salvarUrl}
              className="w-full"
            >
              Salvar string de conexão
            </Button>

            {/* Separador + gerenciar schema */}
            <div className="border-t border-[var(--border)] pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[var(--accent-secondary)]" />
                <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Gerenciamento do Esquema</h3>
              </div>
              <p className="text-[12px] text-[var(--text-muted)]">
                Cria ou recria as tabelas do sistema no banco acima. Teste a conexão antes de prosseguir.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => abrirModal("CRIAR")}
                  icon={<Plus size={13} />}
                  disabled={!testeOk}
                >
                  Criar Tabelas
                </Button>
                <button
                  type="button"
                  onClick={() => abrirModal("RECRIAR")}
                  disabled={!testeOk}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-red-500/8 border-red-500/25 text-red-400 hover:bg-red-500/15 hover:border-red-400/40"
                >
                  <RefreshCw size={13} />
                  Recriar Tabelas
                </button>
              </div>

              <p className="text-[11px] text-amber-400/70 flex items-start gap-1.5">
                <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                <span><strong>Recriar</strong> apaga todos os dados permanentemente.</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Log de Auditoria ────────────────────────────────────── */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[14px] shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[var(--border)]" style={{ marginLeft: '5px' }}>
            <div className="w-7 h-7 rounded-[8px] bg-[var(--accent-secondary)]/10 flex items-center justify-center">
              <Shield size={14} className="text-[var(--accent-secondary)]" />
            </div>
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Log de Auditoria</h2>
            <span className="ml-auto text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-full px-2.5 py-0.5 border border-[var(--border)]">
              {total} registros
            </span>
          </div>

          <div className="overflow-y-auto max-h-[420px] divide-y divide-[var(--border)]">
            {loadingLogs && Array(4).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
                <div className="skeleton h-2.5 w-48 rounded" />
              </div>
            ))}
            {!loadingLogs && logs.length === 0 && (
              <p className="px-6 py-10 text-center text-[13px] text-[var(--text-muted)]">
                Nenhum registro encontrado.
              </p>
            )}
            {!loadingLogs && logs.map((log) => (
              <div key={log.id} className="px-5 py-3 hover:bg-[var(--bg-elevated)] transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[var(--text-primary)]">{log.acao}</span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">{formatarData(log.createdAt)}</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {log.usuario?.nomeCompleto ?? "Sistema"}
                  {log.entidade && <> · {log.entidade}</>}
                  {log.ipAddress && <> · {log.ipAddress}</>}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 px-5 py-3 border-t border-[var(--border)]">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modal confirmação schema ─────────────────────────────── */}
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
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[18px] shadow-[var(--shadow-lg)] w-full max-w-md p-6 space-y-5"
            >
              {/* Cabeçalho */}
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-[10px] shrink-0 ${modal.acao === "RECRIAR" ? "bg-red-500/12 border border-red-500/20" : "bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20"}`}>
                  {modal.acao === "RECRIAR"
                    ? <AlertTriangle size={18} className="text-red-400" />
                    : <Plus size={18} className="text-[var(--accent-primary)]" />}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                    {modal.acao === "RECRIAR" ? "Recriar todas as tabelas" : "Criar tabelas do sistema"}
                  </h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    {modal.acao === "RECRIAR"
                      ? "Esta ação apaga e recria todas as tabelas."
                      : "Serão criadas apenas tabelas que ainda não existem."}
                  </p>
                </div>
              </div>

              {/* Alerta destrutivo */}
              {modal.acao === "RECRIAR" && (
                <div className="bg-red-500/8 border border-red-500/20 rounded-[12px] p-4 space-y-2" style={{ marginLeft: '5px' }}>
                  <p className="text-[12px] font-bold text-red-400 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> ATENÇÃO — Operação irreversível
                  </p>
                  <ul className="text-[11px] text-red-300/80 space-y-1 list-disc list-inside">
                    <li>Todas as tabelas serão <strong>apagadas</strong></li>
                    <li>Todos os dados serão <strong>perdidos permanentemente</strong></li>
                    <li>Não há backup automático nem como desfazer</li>
                  </ul>
                </div>
              )}

              {/* Campo de confirmação */}
              {modal.acao === "RECRIAR" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-widest uppercase">
                    Digite <strong className="text-red-400">CONFIRMAR</strong> para prosseguir
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={modal.confirmText}
                    onChange={(e) => setModal((m) => m ? { ...m, confirmText: e.target.value } : null)}
                    placeholder="CONFIRMAR"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[10px] px-3 py-2.5 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-red-500 focus:ring-[3px] focus:ring-red-500/15 transition-all"
                  />
                </div>
              )}

              {/* Log de execução */}
              {schemaLog.length > 0 && (
                <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[10px] p-3 max-h-44 overflow-y-auto">
                  {schemaLog.map((line, i) => (
                    <p key={i} className={`text-[11px] font-mono leading-5 ${
                      line.startsWith("OK")   ? "text-emerald-400" :
                      line.startsWith("DROP") ? "text-amber-400"   :
                      line.startsWith("SKIP") ? "text-[var(--text-muted)]" :
                      "text-[var(--text-secondary)]"
                    }`}>
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                <Button variant="ghost" className="flex-1" onClick={() => setModal(null)} disabled={executandoSchema}>
                  Cancelar
                </Button>
                <button
                  onClick={executarSchema}
                  disabled={executandoSchema || (modal.acao === "RECRIAR" && modal.confirmText !== "CONFIRMAR")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                    modal.acao === "RECRIAR"
                      ? "bg-red-600 hover:bg-red-700 text-white border border-red-600"
                      : "bg-gradient-to-b from-[#5B9BFF] to-[#2563EB] text-white shadow-[0_2px_12px_rgba(79,142,247,0.35)]"
                  }`}
                >
                  {executandoSchema && <Loader2 size={13} className="animate-spin" />}
                  {modal.acao === "RECRIAR" ? "Recriar Tabelas" : "Criar Tabelas"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
