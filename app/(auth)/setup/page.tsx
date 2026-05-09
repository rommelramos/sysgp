"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, KeyRound, Link2, CheckCircle, AlertTriangle,
  Loader2, User, Mail, Lock, CreditCard, Eye, EyeOff,
  ArrowRight, ArrowLeft, Sparkles, ShieldCheck, Info,
  TableProperties, ChevronDown, ChevronUp,
} from "lucide-react";

/* ── tipos ─────────────────────────────────────────────────────────── */
type Phase = "db" | "user" | "done" | "blocked";

const DEFAULT_ADMIN = {
  nomeCompleto: "Administrador SysGP",
  cpf: "000.000.000-00",
  email: "admin@sysgp.ufpa.br",
  senha: "@12345!",
  confirmar: "@12345!",
};

/* ── helpers ────────────────────────────────────────────────────────── */
function formatCPF(v: string) {
  return v.replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .slice(0, 14);
}

/* ── Campo reutilizável ─────────────────────────────────────────────── */
function Field({
  label, icon, children, right, hint,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] tracking-[0.08em] uppercase">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none z-10">{icon}</span>
        {children}
        {right && <span className="absolute right-3.5 z-10">{right}</span>}
      </div>
      {hint && (
        <p className="text-[11px] text-[var(--text-muted)] flex items-start gap-1.5">
          <Info size={10} className="shrink-0 mt-[2px]" />{hint}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[10px] pl-10 pr-4 py-3 text-[14px] transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-primary)]/[0.15]";

/* ══════════════════════════════════════════════════════════════════════
   Página principal
══════════════════════════════════════════════════════════════════════ */
export default function SetupPage() {
  const router = useRouter();

  /* Fase actual */
  const [phase, setPhase] = useState<Phase | null>(null); // null = verificando

  /* DB */
  const [dbUrl, setDbUrl]   = useState("");
  const [dbPass, setDbPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [testando, setTestando] = useState(false);
  const [testeOk, setTesteOk]   = useState<boolean | null>(null);
  const [testeMsg, setTesteMsg] = useState("");

  /* Schema */
  const [criandoTabelas, setCriandoTabelas] = useState(false);
  const [tabelasOk, setTabelasOk]           = useState<boolean | null>(null);
  const [tabelasLog, setTabelasLog]         = useState<string[]>([]);
  const [tabelasErros, setTabelasErros]     = useState<string[]>([]);
  const [showLog, setShowLog]               = useState(false);

  /* Usuário */
  const [form, setForm] = useState({
    nomeCompleto: "", cpf: "", email: "", senha: "", confirmar: "",
  });
  const [showSenha, setShowSenha] = useState(false);
  const [criando, setCriando]     = useState(false);
  const [userError, setUserError] = useState("");
  const [usedDefault, setUsedDefault] = useState(false);

  /* ── Verificação inicial ─────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.configured) setPhase("blocked");
        else {
          // pré-preenche URL com a env var do servidor (sem senha)
          setDbUrl(d.dbUrl ?? "");
          setPhase("db");
        }
      })
      .catch(() => setPhase("db")); // mesmo com erro, deixa tentar
  }, []);

  /* ── Teste de conexão ────────────────────────────────────────── */
  async function testarConexao() {
    setTestando(true);
    setTesteOk(null);
    setTesteMsg("");
    // reset schema state on new test
    setTabelasOk(null);
    setTabelasLog([]);
    setTabelasErros([]);
    setShowLog(false);
    try {
      const res = await fetch("/api/setup/testar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: dbUrl, senha: dbPass }),
      });
      const data = await res.json();
      setTesteOk(data.ok === true);
      setTesteMsg(data.ok ? "Conexão bem-sucedida!" : (data.error ?? "Falha na conexão"));
    } catch {
      setTesteOk(false);
      setTesteMsg("Erro ao comunicar com o servidor");
    } finally {
      setTestando(false);
    }
  }

  /* ── Criar tabelas ───────────────────────────────────────────── */
  async function criarTabelas() {
    setCriandoTabelas(true);
    setTabelasOk(null);
    setTabelasLog([]);
    setTabelasErros([]);
    setShowLog(false);
    try {
      const res = await fetch("/api/setup/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: dbUrl, senha: dbPass }),
      });
      const data = await res.json();
      setTabelasOk(data.ok === true);
      setTabelasLog(data.executados ?? []);
      setTabelasErros(data.erros ?? []);
      if (data.erros?.length > 0) setShowLog(true);
    } catch {
      setTabelasOk(false);
      setTabelasErros(["Erro ao comunicar com o servidor"]);
    } finally {
      setCriandoTabelas(false);
    }
  }

  /* ── Criar usuário ───────────────────────────────────────────── */
  async function criarAdmin(e: React.FormEvent) {
    e.preventDefault();
    setUserError("");
    if (form.senha !== form.confirmar) {
      setUserError("As senhas não coincidem.");
      return;
    }
    if (form.senha.length < 6) {
      setUserError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    setCriando(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCompleto: form.nomeCompleto,
          cpf: form.cpf,
          email: form.email,
          senha: form.senha,
        }),
      });
      const data = await res.json();
      if (res.ok) setPhase("done");
      else setUserError(data.error ?? "Erro ao criar usuário.");
    } catch {
      setUserError("Erro de conexão.");
    } finally {
      setCriando(false);
    }
  }

  function usarPadrao() {
    setForm(DEFAULT_ADMIN);
    setUsedDefault(true);
  }

  /* ════════════════════════════════════════════════════════════════
     Render
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4 py-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
      <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05] pointer-events-none"
        style={{ background: "radial-gradient(circle, #4F8EF7 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)]/50 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full"
        style={{ maxWidth: 460 }}
      >
        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(19, 22, 31, 0.92)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 0 1px rgba(79,142,247,0.06), 0 20px 60px rgba(0,0,0,0.55)",
          }}
        >
          {/* ── Verificando ─────────────────────────────── */}
          {phase === null && (
            <div className="p-10 flex flex-col items-center gap-3">
              <Loader2 size={24} className="animate-spin text-[var(--accent-primary)]" />
              <p className="text-[13px] text-[var(--text-muted)]">Verificando banco de dados…</p>
            </div>
          )}

          {/* ── Já configurado ─────────────────────────── */}
          {phase === "blocked" && (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto">
                <CheckCircle size={22} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[16px] font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)]">
                  Sistema já configurado
                </p>
                <p className="text-[13px] text-[var(--text-muted)] mt-1">
                  Um administrador já existe. Esta página está desativada por segurança.
                </p>
              </div>
              <button onClick={() => router.push("/login")}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent-primary)] hover:underline">
                Ir para o login <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* ── Concluído ──────────────────────────────── */}
          {phase === "done" && (
            <div className="p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto">
                <CheckCircle size={26} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[18px] font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)]">
                  Administrador criado!
                </p>
                <p className="text-[13px] text-[var(--text-muted)] mt-1.5">
                  Use as credenciais definidas para fazer o primeiro acesso.
                </p>
                {usedDefault && (
                  <div className="mt-3 bg-amber-400/8 border border-amber-400/20 rounded-[10px] px-4 py-3 text-left">
                    <p className="text-[12px] font-semibold text-amber-400 mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Credenciais padrão utilizadas
                    </p>
                    <p className="text-[12px] text-[var(--text-muted)] font-mono">
                      Login: <span className="text-[var(--text-secondary)]">{DEFAULT_ADMIN.email}</span>
                    </p>
                    <p className="text-[12px] text-[var(--text-muted)] font-mono">
                      Senha: <span className="text-[var(--text-secondary)]">{DEFAULT_ADMIN.senha}</span>
                    </p>
                    <p className="text-[11px] text-amber-400/70 mt-2">
                      Altere a senha após o primeiro acesso.
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full py-3 rounded-[10px] text-[14px] font-semibold text-white font-[family-name:var(--font-display)] flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(160deg, #5B9BFF 0%, #2563EB 100%)", boxShadow: "0 2px 16px rgba(79,142,247,0.35)" }}
              >
                Ir para o login <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* ── FASE 1: Banco de Dados ─────────────────── */}
          <AnimatePresence mode="wait">
            {phase === "db" && (
              <motion.div key="db" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>

                {/* Header */}
                <div className="px-8 pt-8 pb-6">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center shrink-0">
                      <Database size={16} className="text-[var(--accent-primary)]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)] font-semibold tracking-widest uppercase">
                        Passo 1 de 2
                      </p>
                      <h2 className="text-[17px] font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)] tracking-tight">
                        Conexão com o Banco
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

                <div className="px-8 py-6 space-y-5">

                  {/* URL */}
                  <Field label="String de Conexão" icon={<Link2 size={15} />}
                    hint="Formato: mysql://usuario@host:3306/nome_do_banco">
                    <input
                      type="text"
                      value={dbUrl}
                      onChange={(e) => { setDbUrl(e.target.value); setTesteOk(null); setTesteMsg(""); setTabelasOk(null); }}
                      placeholder="mysql://usuario@host:3306/sysgp"
                      spellCheck={false}
                      className={inputCls + " font-mono text-[13px]"}
                    />
                  </Field>

                  {/* Senha */}
                  <Field label="Senha do Banco" icon={<KeyRound size={15} />}
                    hint="A senha nunca é salva no banco de dados."
                    right={
                      <button type="button" tabIndex={-1} onClick={() => setShowPass(s => !s)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }>
                    <input
                      type={showPass ? "text" : "password"}
                      value={dbPass}
                      onChange={(e) => { setDbPass(e.target.value); setTesteOk(null); setTesteMsg(""); setTabelasOk(null); }}
                      placeholder="Senha do banco de dados"
                      className={inputCls + " pr-11"}
                    />
                  </Field>

                  {/* ── Sub-etapa 1: Testar conexão ── */}
                  <div className="space-y-2">
                    <button type="button" onClick={testarConexao} disabled={testando || !dbUrl}
                      className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
                      {testando ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                      {testando ? "Testando…" : "Testar Conexão"}
                    </button>

                    <AnimatePresence mode="wait">
                      {testeOk === true && (
                        <motion.div key="ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-2 text-[13px] text-emerald-400 bg-emerald-400/8 border border-emerald-400/20 rounded-[8px] px-3 py-2.5">
                          <CheckCircle size={14} className="shrink-0" /> {testeMsg}
                        </motion.div>
                      )}
                      {testeOk === false && (
                        <motion.div key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-start gap-2 text-[12px] text-red-400 bg-red-400/8 border border-red-400/20 rounded-[8px] px-3 py-2.5">
                          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                          <span className="break-all">{testeMsg}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Sub-etapa 2: Criar tabelas (aparece após conexão OK) ── */}
                  <AnimatePresence>
                    {testeOk === true && (
                      <motion.div
                        key="schema-section"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                      >
                        {/* Divider com label */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-[var(--border)]" />
                          <span className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-1">
                            Estrutura do banco
                          </span>
                          <div className="flex-1 h-px bg-[var(--border)]" />
                        </div>

                        <button
                          type="button"
                          onClick={criarTabelas}
                          disabled={criandoTabelas || tabelasOk === true}
                          className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold border transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                          style={
                            tabelasOk === true
                              ? { borderColor: "rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.06)", color: "rgb(52,211,153)", opacity: 1 }
                              : { borderColor: "var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)" }
                          }
                        >
                          {criandoTabelas ? (
                            <><Loader2 size={14} className="animate-spin" /> Criando tabelas…</>
                          ) : tabelasOk === true ? (
                            <><CheckCircle size={14} /> Tabelas criadas com sucesso</>
                          ) : (
                            <><TableProperties size={14} /> Criar Tabelas do Sistema</>
                          )}
                        </button>

                        {/* Resultado / erros */}
                        <AnimatePresence>
                          {tabelasOk === false && tabelasErros.length > 0 && (
                            <motion.div key="tab-err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className="text-[12px] text-red-400 bg-red-400/8 border border-red-400/20 rounded-[8px] px-3 py-2.5 space-y-1">
                              <p className="font-semibold flex items-center gap-1.5"><AlertTriangle size={12} /> Erros ao criar tabelas:</p>
                              {tabelasErros.map((e, i) => (
                                <p key={i} className="font-mono break-all opacity-80">{e}</p>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Log expansível */}
                        {tabelasLog.length > 0 && (
                          <div className="rounded-[8px] border border-[var(--border)] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setShowLog(s => !s)}
                              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all"
                            >
                              <span>Log de execução ({tabelasLog.length} operações)</span>
                              {showLog ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            <AnimatePresence>
                              {showLog && (
                                <motion.div
                                  key="log"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-2.5 max-h-36 overflow-y-auto space-y-0.5"
                                    style={{ borderTop: "1px solid var(--border)" }}>
                                    {tabelasLog.map((line, i) => (
                                      <p key={i} className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">{line}</p>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Próximo passo (só habilita com tabelas criadas) ── */}
                  <button
                    type="button"
                    disabled={!tabelasOk}
                    onClick={() => setPhase("user")}
                    className="w-full py-3 rounded-[10px] text-[14px] font-semibold text-white font-[family-name:var(--font-display)] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(160deg, #5B9BFF 0%, #2563EB 100%)", boxShadow: "0 2px 16px rgba(79,142,247,0.35)" }}
                  >
                    Próximo — Criar Administrador <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── FASE 2: Criar Admin ─────────────────────── */}
          <AnimatePresence mode="wait">
            {phase === "user" && (
              <motion.div key="user" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }}>

                {/* Header */}
                <div className="px-8 pt-8 pb-6">
                  <button onClick={() => setPhase("db")}
                    className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors mb-4">
                    <ArrowLeft size={12} /> Voltar
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/20 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} className="text-[var(--accent-secondary)]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)] font-semibold tracking-widest uppercase">
                        Passo 2 de 2
                      </p>
                      <h2 className="text-[17px] font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)] tracking-tight">
                        Criar Administrador
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

                <form onSubmit={criarAdmin} className="px-8 py-6 space-y-4">

                  {/* Preencher padrão */}
                  <button type="button" onClick={usarPadrao}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold border border-[var(--accent-secondary)]/25 bg-[var(--accent-secondary)]/6 text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/12 hover:border-[var(--accent-secondary)]/40 transition-all">
                    <Sparkles size={13} />
                    Preencher com credenciais padrão
                  </button>

                  {usedDefault && (
                    <div className="bg-amber-400/8 border border-amber-400/20 rounded-[10px] px-3 py-2.5 space-y-1">
                      <p className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle size={11} /> Credenciais padrão — altere após o primeiro acesso
                      </p>
                      <p className="text-[11px] font-mono text-[var(--text-muted)]">
                        {DEFAULT_ADMIN.email} / <span className="text-amber-400/80">{DEFAULT_ADMIN.senha}</span>
                      </p>
                    </div>
                  )}

                  {/* Nome */}
                  <Field label="Nome completo" icon={<User size={15} />}>
                    <input type="text" required placeholder="Ex: João da Silva"
                      value={form.nomeCompleto}
                      onChange={e => setForm(f => ({ ...f, nomeCompleto: e.target.value }))}
                      className={inputCls} />
                  </Field>

                  {/* CPF */}
                  <Field label="CPF" icon={<CreditCard size={15} />}>
                    <input type="text" required placeholder="000.000.000-00"
                      value={form.cpf} maxLength={14}
                      onChange={e => setForm(f => ({ ...f, cpf: formatCPF(e.target.value) }))}
                      className={inputCls} />
                  </Field>

                  {/* E-mail */}
                  <Field label="E-mail" icon={<Mail size={15} />}>
                    <input type="email" required placeholder="admin@instituicao.br"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className={inputCls} />
                  </Field>

                  {/* Senha */}
                  <Field label="Senha" icon={<Lock size={15} />}
                    right={
                      <button type="button" tabIndex={-1} onClick={() => setShowSenha(s => !s)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                        {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }>
                    <input
                      type={showSenha ? "text" : "password"}
                      required minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      value={form.senha}
                      onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                      className={inputCls + " pr-11"} />
                  </Field>

                  {/* Confirmar */}
                  <Field label="Confirmar senha" icon={<Lock size={15} />}>
                    <input
                      type={showSenha ? "text" : "password"}
                      required placeholder="Repita a senha"
                      value={form.confirmar}
                      onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
                      className={inputCls} />
                  </Field>

                  {/* Erro */}
                  {userError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="text-[13px] text-red-400 bg-red-400/8 border border-red-400/20 rounded-[8px] px-3 py-2.5 text-center">
                      {userError}
                    </motion.p>
                  )}

                  {/* Submit */}
                  <button type="submit" disabled={criando}
                    className="w-full py-3 rounded-[10px] text-[14px] font-semibold text-white font-[family-name:var(--font-display)] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 mt-2"
                    style={{ background: "linear-gradient(160deg, #5B9BFF 0%, #2563EB 100%)", boxShadow: "0 2px 16px rgba(79,142,247,0.35)" }}>
                    {criando ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                    {criando ? "Criando…" : "Criar Administrador"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-[11px] text-[var(--text-muted)]/50 mt-5">
          UFPA — Sistema Gerenciador de Projetos
        </p>
      </motion.div>
    </div>
  );
}
