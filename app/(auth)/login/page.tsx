"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";

function Particle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{ left: `${x}%`, top: `${y}%`, width: 4, height: 4, background: "rgba(6,182,212,0.4)" }}
      animate={{
        y: [0, -20, 0],
        opacity: [0.3, 0.7, 0.3],
        scale: [1, 1.2, 1],
      }}
      transition={{ duration: 3 + delay, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  delay: Math.random() * 3,
}));

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
      toast("success", "Login realizado com sucesso!");
      router.push("/dashboard");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 50%, #0d1a3a 0%, #0A0E1A 60%)",
      }}
    >
      {/* Background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <Particle key={p.id} x={p.x} y={p.y} delay={p.delay} />
        ))}
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(37,99,235,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="rounded-2xl p-8 border"
          style={{
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            background: "rgba(17,24,39,0.85)",
            borderColor: "rgba(255,255,255,0.08)",
            boxShadow: "0 0 40px rgba(37,99,235,0.15), 0 25px 50px rgba(0,0,0,0.5)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 mb-3">
              <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28 6L50 18V38L28 50L6 38V18L28 6Z" stroke="#06B6D4" strokeWidth="2" fill="none" />
                <path d="M28 6L28 50M6 18L50 38M50 18L6 38" stroke="#06B6D4" strokeWidth="1.2" opacity="0.35" />
                <circle cx="28" cy="28" r="5" fill="#06B6D4" />
                <circle cx="28" cy="6" r="2.5" fill="#2563EB" />
                <circle cx="50" cy="18" r="2.5" fill="#2563EB" />
                <circle cx="50" cy="38" r="2.5" fill="#2563EB" />
                <circle cx="28" cy="50" r="2.5" fill="#2563EB" />
                <circle cx="6" cy="38" r="2.5" fill="#2563EB" />
                <circle cx="6" cy="18" r="2.5" fill="#2563EB" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold leading-none">
              <span className="text-[var(--text-primary)]">Sys</span>
              <span className="text-[var(--accent-secondary)]">GP</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1.5">
              Gestão inteligente de projetos e bolsistas
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                <Mail size={16} />
              </span>
              <input
                type="email"
                placeholder="E-mail institucional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.25)] transition-all"
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                <Lock size={16} />
              </span>
              <input
                type={showSenha ? "text" : "password"}
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.25)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400 text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                boxShadow: "0 4px 20px rgba(37,99,235,0.35)",
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="/recuperar-senha"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-secondary)] transition-colors"
            >
              Esqueci minha senha
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
