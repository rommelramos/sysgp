"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) setSent(true);
      else setError(data.error || "Erro ao enviar e-mail");
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div
          className="rounded-[20px] border overflow-hidden"
          style={{
            background: "rgba(21,25,33,0.88)",
            backdropFilter: "blur(24px) saturate(1.5)",
            WebkitBackdropFilter: "blur(24px) saturate(1.5)",
            borderColor: "rgba(255,255,255,0.07)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,142,247,0.08)",
          }}
        >
          <div className="px-8 py-7 space-y-5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <ArrowLeft size={12} />
              Voltar ao login
            </Link>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4 space-y-3"
              >
                <div className="w-12 h-12 bg-emerald-400/10 border border-emerald-400/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)]">
                    E-mail enviado
                  </p>
                  <p className="text-[13px] text-[var(--text-muted)] mt-1">
                    Se o e-mail existir no sistema, você receberá o link em breve.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-block text-[13px] text-[var(--accent-primary)] hover:underline"
                >
                  Voltar ao login
                </Link>
              </motion.div>
            ) : (
              <>
                <div>
                  <h1 className="text-[20px] font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)] tracking-tight">
                    Recuperar senha
                  </h1>
                  <p className="text-[13px] text-[var(--text-muted)] mt-1">
                    Informe seu e-mail para receber o link de recuperação.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-widest uppercase">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[10px] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[rgba(79,142,247,0.18)] transition-all duration-150"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-[13px] text-red-400 bg-red-400/8 border border-red-400/20 rounded-[8px] px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full py-2.5 rounded-[10px] text-sm font-semibold text-white font-[family-name:var(--font-display)] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #5B9BFF 0%, #2563EB 100%)",
                      boxShadow: "0 2px 16px rgba(79,142,247,0.35)",
                    }}
                  >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {loading ? "Enviando..." : "Enviar link de recuperação"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-[var(--text-muted)] mt-4 opacity-60">
          UFPA — Sistema Gerenciador de Projetos
        </p>
      </motion.div>
    </div>
  );
}
