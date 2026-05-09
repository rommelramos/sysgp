"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, User, Mail, Lock, CreditCard, Eye, EyeOff, CheckCircle, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

type Step = "checking" | "ready" | "done" | "blocked" | "error";

export default function SetupPage() {
  const [step, setStep] = useState<Step>("checking");
  const [dbError, setDbError] = useState("");
  const [form, setForm] = useState({ nomeCompleto: "", cpf: "", email: "", senha: "", confirmar: "" });
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const router = useRouter();

  /* Verifica se o setup já foi feito */
  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.configured) setStep("blocked");
        else if (d.error)  { setStep("error"); setDbError(d.error); }
        else               setStep("ready");
      })
      .catch(() => { setStep("error"); setDbError("Não foi possível conectar ao banco de dados."); });
  }, []);

  function formatCPF(v: string) {
    return v.replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .slice(0, 14);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError("");

    if (form.senha !== form.confirmar) {
      setFieldError("As senhas não coincidem.");
      return;
    }
    if (form.senha.length < 8) {
      setFieldError("Senha deve ter ao menos 8 caracteres.");
      return;
    }

    setLoading(true);
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
      if (res.ok) {
        setStep("done");
      } else {
        setFieldError(data.error || "Erro ao criar usuário.");
      }
    } catch {
      setFieldError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Background dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="rounded-[20px] border overflow-hidden"
          style={{
            background: "rgba(21,25,33,0.9)",
            backdropFilter: "blur(24px) saturate(1.5)",
            WebkitBackdropFilter: "blur(24px) saturate(1.5)",
            borderColor: "rgba(255,255,255,0.07)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,142,247,0.08)",
          }}
        >
          {/* Header */}
          <div className="px-8 pt-7 pb-5 border-b border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center">
                <ShieldCheck size={18} className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--text-primary)] tracking-tight leading-none">
                  Configuração Inicial
                </h1>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">SysGP — Primeiro acesso</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            <AnimatePresence mode="wait">

              {/* Checking */}
              {step === "checking" && (
                <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-6 gap-3">
                  <Loader2 size={24} className="animate-spin text-[var(--accent-primary)]" />
                  <p className="text-sm text-[var(--text-secondary)]">Verificando banco de dados...</p>
                </motion.div>
              )}

              {/* DB Error */}
              {step === "error" && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-4">
                  <div className="bg-amber-400/8 border border-amber-400/20 rounded-[12px] p-4 flex gap-3">
                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-semibold text-amber-400">Banco inacessível</p>
                      <p className="text-[12px] text-[var(--text-muted)] mt-1">{dbError}</p>
                    </div>
                  </div>
                  <div className="bg-[var(--bg-elevated)] rounded-[12px] p-4 space-y-2">
                    <p className="text-[12px] font-semibold text-[var(--text-secondary)]">Para corrigir:</p>
                    <ol className="text-[12px] text-[var(--text-muted)] space-y-1.5 list-decimal list-inside">
                      <li>Configure o <code className="text-[var(--accent-secondary)]">DATABASE_URL</code> nas variáveis de ambiente (Vercel → Settings → Env Vars)</li>
                      <li>Crie as tabelas em <span className="text-[var(--text-secondary)]">Admin → Configurações → Gerenciamento do Esquema</span></li>
                      <li>Recarregue esta página</li>
                    </ol>
                  </div>
                  <button
                    onClick={() => { setStep("checking"); fetch("/api/setup").then(r => r.json()).then(d => { if (d.configured) setStep("blocked"); else if (d.error) { setStep("error"); setDbError(d.error); } else setStep("ready"); }); }}
                    className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-all"
                  >
                    Verificar novamente
                  </button>
                </motion.div>
              )}

              {/* Already configured */}
              {step === "blocked" && (
                <motion.div key="blocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-4 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto">
                    <CheckCircle size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)]">
                      Sistema já configurado
                    </p>
                    <p className="text-[13px] text-[var(--text-muted)] mt-1">
                      Um administrador já existe. Esta página está desativada por segurança.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/login")}
                    className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--accent-primary)] hover:underline"
                  >
                    Ir para o login <ArrowRight size={13} />
                  </button>
                </motion.div>
              )}

              {/* Done */}
              {step === "done" && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }} className="space-y-4 text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mx-auto">
                    <CheckCircle size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[17px] font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)]">
                      Administrador criado!
                    </p>
                    <p className="text-[13px] text-[var(--text-muted)] mt-1.5">
                      Use as credenciais que você definiu para fazer o primeiro acesso.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/login")}
                    className="w-full py-2.5 rounded-[10px] text-sm font-semibold text-white font-[family-name:var(--font-display)] transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, #5B9BFF 0%, #2563EB 100%)",
                      boxShadow: "0 2px 16px rgba(79,142,247,0.35)",
                    }}
                  >
                    Ir para o login
                  </button>
                </motion.div>
              )}

              {/* Form */}
              {step === "ready" && (
                <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onSubmit={handleSubmit} className="space-y-4">

                  <p className="text-[13px] text-[var(--text-muted)] -mt-1">
                    Nenhum usuário encontrado. Crie o administrador do sistema para começar.
                  </p>

                  {/* Nome */}
                  <Field label="Nome completo" icon={<User size={14} />}>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={form.nomeCompleto}
                      onChange={e => setForm(f => ({ ...f, nomeCompleto: e.target.value }))}
                      required
                      className="field-input"
                    />
                  </Field>

                  {/* CPF */}
                  <Field label="CPF" icon={<CreditCard size={14} />}>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={form.cpf}
                      onChange={e => setForm(f => ({ ...f, cpf: formatCPF(e.target.value) }))}
                      maxLength={14}
                      required
                      className="field-input"
                    />
                  </Field>

                  {/* E-mail */}
                  <Field label="E-mail" icon={<Mail size={14} />}>
                    <input
                      type="email"
                      placeholder="admin@instituicao.br"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                      className="field-input"
                    />
                  </Field>

                  {/* Senha */}
                  <Field label="Senha" icon={<Lock size={14} />}
                    rightSlot={
                      <button type="button" tabIndex={-1} onClick={() => setShowSenha(s => !s)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                        {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                  >
                    <input
                      type={showSenha ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={form.senha}
                      onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                      required
                      minLength={8}
                      className="field-input pr-9"
                    />
                  </Field>

                  {/* Confirmar senha */}
                  <Field label="Confirmar senha" icon={<Lock size={14} />}>
                    <input
                      type={showSenha ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={form.confirmar}
                      onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
                      required
                      className="field-input"
                    />
                  </Field>

                  {fieldError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="text-[13px] text-red-400 bg-red-400/8 border border-red-400/20 rounded-[8px] px-3 py-2 text-center">
                      {fieldError}
                    </motion.p>
                  )}

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-[10px] text-sm font-semibold text-white font-[family-name:var(--font-display)] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, #5B9BFF 0%, #2563EB 100%)",
                        boxShadow: "0 2px 16px rgba(79,142,247,0.35)",
                      }}
                    >
                      {loading && <Loader2 size={14} className="animate-spin" />}
                      {loading ? "Criando..." : "Criar administrador"}
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] text-center">
                    Esta página é desativada automaticamente após o cadastro.
                  </p>
                </motion.form>
              )}

            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-[11px] text-[var(--text-muted)] mt-4 opacity-60">
          UFPA — Sistema Gerenciador de Projetos
        </p>
      </motion.div>

      {/* Inline styles for field inputs */}
      <style>{`
        .field-input {
          width: 100%;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-radius: 10px;
          padding: 10px 12px 10px 36px;
          font-size: 13px;
          transition: all 150ms ease;
        }
        .field-input:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(79,142,247,0.18);
        }
        .field-input::placeholder { color: var(--text-muted); }
        .field-input.pr-9 { padding-right: 36px; }
      `}</style>
    </div>
  );
}

function Field({
  label, icon, children, rightSlot,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-widest uppercase">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-[var(--text-muted)]">{icon}</span>
        {children}
        {rightSlot && (
          <span className="absolute right-3 text-[var(--text-muted)]">{rightSlot}</span>
        )}
      </div>
    </div>
  );
}
