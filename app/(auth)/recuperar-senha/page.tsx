"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
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
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 50%, #0d1a3a 0%, #0A0E1A 60%)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-4"
      >
        <div
          className="rounded-2xl p-8 border"
          style={{
            backdropFilter: "blur(12px)",
            background: "rgba(17,24,39,0.85)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
          >
            <ArrowLeft size={14} /> Voltar ao login
          </Link>

          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">Recuperar senha</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Informe seu e-mail para receber o link de recuperação.
          </p>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail size={20} className="text-emerald-400" />
              </div>
              <p className="text-sm text-[var(--text-primary)]">
                Se o e-mail existir, você receberá um link em breve.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.25)] transition-all"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold text-sm text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }}
              >
                {loading ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
