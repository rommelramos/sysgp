"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, FolderKanban } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const [email, setEmail]         = useState("");
  const [senha, setSenha]         = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const { login, user }           = useAuth();
  const router                    = useRouter();
  const toast                     = useToast();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) return;
    setLoading(true);
    setError("");
    const result = await login(email, senha);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      toast("success", "Bem-vindo de volta!");
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4 py-8 relative overflow-hidden">

      {/* Soft blue blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/4 w-[480px] h-[480px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #2563EB 0%, transparent 70%)", filter: "blur(70px)" }} />
        <div className="absolute -bottom-24 right-1/4 w-[380px] h-[380px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #0EA5E9 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full"
        style={{ maxWidth: 400 }}
      >
        <div className="bg-white rounded-2xl p-8 space-y-6 border border-[var(--border)] shadow-[0_8px_32px_rgba(37,99,235,0.08),0_2px_8px_rgba(0,0,0,0.06)]">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center shadow-[0_4px_16px_rgba(37,99,235,0.3)]">
              <FolderKanban size={24} className="text-white" aria-hidden="true" />
            </div>
            <div className="text-center">
              <h1 className="font-[family-name:var(--font-display)] text-[26px] font-extrabold tracking-tight leading-none">
                <span className="text-[var(--text-primary)]">Sys</span>
                <span className="text-[var(--accent-primary)]">GP</span>
              </h1>
              <p className="text-[13px] text-[var(--text-muted)] mt-1.5">
                Gestão de projetos e bolsistas
              </p>
            </div>
          </div>

          <div className="h-px bg-[var(--border)]" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-[11px] font-semibold text-[var(--text-secondary)] tracking-[0.08em] uppercase">
                E-mail
              </label>
              <div className="relative flex items-center">
                <Mail size={15} className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none z-10" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[10px] pl-10 pr-4 py-3 text-[14px] transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label htmlFor="login-senha" className="block text-[11px] font-semibold text-[var(--text-secondary)] tracking-[0.08em] uppercase">
                Senha
              </label>
              <div className="relative flex items-center">
                <Lock size={15} className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none z-10" aria-hidden="true" />
                <input
                  id="login-senha"
                  type={showSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[10px] pl-10 pr-11 py-3 text-[14px] transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors z-10"
                >
                  {showSenha ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2.5 text-center"
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !senha}
              className="w-full py-3 rounded-[10px] text-[14px] font-semibold text-white font-[family-name:var(--font-display)] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 bg-[var(--accent-primary)] hover:bg-[#1D4ED8] shadow-[0_2px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:-translate-y-px active:translate-y-0"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-[13px] text-[var(--text-muted)]">
            <a href="/recuperar-senha" className="hover:text-[var(--accent-primary)] transition-colors">
              Esqueci minha senha
            </a>
          </p>
        </div>

        <p className="text-center text-[11px] text-[var(--text-muted)] mt-5">
          UFPA — Sistema Gerenciador de Projetos
        </p>
      </motion.div>
    </div>
  );
}
