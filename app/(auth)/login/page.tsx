"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [senha, setSenha]       = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const { login, user }         = useAuth();
  const router                  = useRouter();
  const toast                   = useToast();

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

      {/* Dot-grid background */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Soft colour blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #4F8EF7 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute -bottom-32 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #2DD4BF 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {/* Thin accent line at top */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)]/50 to-transparent" />

      {/* ── Card ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full"
        style={{ maxWidth: 400 }}
      >
        <div
          className="rounded-2xl p-8 space-y-6"
          style={{
            background: "rgba(19, 22, 31, 0.92)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 0 0 1px rgba(79,142,247,0.06), 0 20px 60px rgba(0,0,0,0.55)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L44 15V33L24 44L4 33V15L24 4Z"
                stroke="#2DD4BF" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
              <path d="M24 4L24 44M4 15L44 33M44 15L4 33"
                stroke="#2DD4BF" strokeWidth="0.7" opacity="0.3" />
              <circle cx="24" cy="24" r="5" fill="#4F8EF7" />
              {[{cx:24,cy:4},{cx:44,cy:15},{cx:44,cy:33},{cx:24,cy:44},{cx:4,cy:33},{cx:4,cy:15}].map((p,i) => (
                <circle key={i} cx={p.cx} cy={p.cy} r="2.2" fill="#2DD4BF" opacity="0.75" />
              ))}
            </svg>
            <div className="text-center">
              <h1 className="font-[family-name:var(--font-display)] text-[28px] font-extrabold tracking-tight leading-none">
                <span className="text-[var(--text-primary)]">Sys</span>
                <span className="text-[var(--accent-secondary)]">GP</span>
              </h1>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">
                Gestão de projetos e bolsistas
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] tracking-[0.08em] uppercase">
                E-mail
              </label>
              <div className="relative flex items-center">
                <Mail size={15} className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none z-10" />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[10px] pl-10 pr-4 py-3 text-[14px] transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-primary)]/[0.15]"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] tracking-[0.08em] uppercase">
                Senha
              </label>
              <div className="relative flex items-center">
                <Lock size={15} className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none z-10" />
                <input
                  type={showSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[10px] pl-10 pr-11 py-3 text-[14px] transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-primary)]/[0.15]"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  tabIndex={-1}
                  className="absolute right-3.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors z-10"
                >
                  {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] text-red-400 bg-red-400/[0.07] border border-red-400/20 rounded-[8px] px-3 py-2.5 text-center"
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !senha}
              className="w-full py-3 rounded-[10px] text-[14px] font-semibold text-white font-[family-name:var(--font-display)] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{
                background: "linear-gradient(160deg, #5B9BFF 0%, #2563EB 100%)",
                boxShadow: "0 2px 16px rgba(79,142,247,0.35)",
              }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Forgot password */}
          <p className="text-center text-[13px] text-[var(--text-muted)]">
            <a href="/recuperar-senha" className="hover:text-[var(--accent-primary)] transition-colors">
              Esqueci minha senha
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[var(--text-muted)]/50 mt-5">
          UFPA — Sistema Gerenciador de Projetos
        </p>
      </motion.div>
    </div>
  );
}
