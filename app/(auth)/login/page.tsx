"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";

/* Floating orbs */
function Orb({ cx, cy, r, delay }: { cx: string; cy: string; r: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: cx, top: cy,
        width: r * 2, height: r * 2,
        marginLeft: -r, marginTop: -r,
        background: `radial-gradient(circle, rgba(79,142,247,0.12) 0%, transparent 70%)`,
        filter: "blur(32px)",
      }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 5 + delay, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

const orbs = [
  { cx: "20%", cy: "20%", r: 200, delay: 0 },
  { cx: "80%", cy: "70%", r: 260, delay: 1.5 },
  { cx: "60%", cy: "15%", r: 150, delay: 2.8 },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, user } = useAuth();
  const router = useRouter();
  const toast = useToast();

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--bg-primary)]">

      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Orbs */}
      <div className="absolute inset-0">
        {orbs.map((o, i) => <Orb key={i} {...o} />)}
      </div>

      {/* Thin top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-40" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
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
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-[rgba(255,255,255,0.05)]">
            {/* Logo mark */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 4L44 15V33L24 44L4 33V15L24 4Z"
                    stroke="#2DD4BF" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                  <path d="M24 4L24 44M4 15L44 33M44 15L4 33"
                    stroke="#2DD4BF" strokeWidth="0.8" opacity="0.3" />
                  <circle cx="24" cy="24" r="5" fill="#4F8EF7" />
                  <circle cx="24" cy="4"  r="2" fill="#2DD4BF" opacity="0.8"/>
                  <circle cx="44" cy="15" r="2" fill="#2DD4BF" opacity="0.8"/>
                  <circle cx="44" cy="33" r="2" fill="#2DD4BF" opacity="0.8"/>
                  <circle cx="24" cy="44" r="2" fill="#2DD4BF" opacity="0.8"/>
                  <circle cx="4"  cy="33" r="2" fill="#2DD4BF" opacity="0.8"/>
                  <circle cx="4"  cy="15" r="2" fill="#2DD4BF" opacity="0.8"/>
                </svg>
              </div>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-[26px] font-extrabold tracking-tight leading-none mb-1">
              <span className="text-[var(--text-primary)]">Sys</span>
              <span className="text-[var(--accent-secondary)]">GP</span>
            </h1>
            <p className="text-[13px] text-[var(--text-muted)]">
              Gestão de projetos e bolsistas
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {/* E-mail */}
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
                  autoComplete="email"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[10px] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[rgba(79,142,247,0.18)] transition-all duration-150"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-widest uppercase">
                Senha
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type={showSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[10px] pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[rgba(79,142,247,0.18)] transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                >
                  {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/8 border border-red-500/20 rounded-[8px] px-3 py-2.5 text-[13px] text-red-400 text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !senha}
              className="w-full py-2.5 rounded-[10px] text-sm font-semibold text-white font-[family-name:var(--font-display)] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #5B9BFF 0%, #2563EB 100%)",
                boxShadow: "0 2px 16px rgba(79,142,247,0.35)",
              }}
              onMouseOver={(e) => { if (!loading) (e.currentTarget.style.boxShadow = "0 4px 24px rgba(79,142,247,0.5)"); }}
              onMouseOut={(e) => { (e.currentTarget.style.boxShadow = "0 2px 16px rgba(79,142,247,0.35)"); }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {/* Recover */}
            <div className="text-center pt-1">
              <a
                href="/recuperar-senha"
                className="text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
              >
                Esqueci minha senha
              </a>
            </div>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-[var(--text-muted)] mt-4 opacity-60">
          UFPA — Sistema Gerenciador de Projetos
        </p>
      </motion.div>
    </div>
  );
}
