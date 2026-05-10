"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { FolderKanban, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { mascaraCPFInput, calcularForcaSenha } from "@/lib/utils";

interface ConviteInfo {
  token: string;
  descricao: string | null;
  usoMaximo: number;
  usoAtual: number;
}

type Fase = "loading" | "invalido" | "form" | "sucesso";

export default function AutoCadastroPage() {
  const params = useParams();
  const token = params?.token as string;

  const [fase, setFase] = useState<Fase>("loading");
  const [convite, setConvite] = useState<ConviteInfo | null>(null);
  const [erroConvite, setErroConvite] = useState("");

  const [form, setForm] = useState({
    nomeCompleto: "", cpf: "", rg: "", dataNasc: "",
    email: "", senha: "", confirmarSenha: "",
  });
  const [showSenha, setShowSenha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/convites/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) { setErroConvite(d.error || "Convite inválido"); setFase("invalido"); return; }
        setConvite(d);
        setFase("form");
      })
      .catch(() => { setErroConvite("Erro ao verificar convite"); setFase("invalido"); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.senha !== form.confirmarSenha) { setErro("As senhas não coincidem"); return; }
    setSubmitting(true);
    setErro("");
    try {
      const res = await fetch(`/api/convites/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, token }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao realizar cadastro"); return; }
      setFase("sucesso");
    } catch {
      setErro("Erro de comunicação com o servidor");
    } finally {
      setSubmitting(false);
    }
  }

  const forca = calcularForcaSenha(form.senha);

  if (fase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fase === "invalido") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4"
        >
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Convite inválido</h1>
          <p className="text-sm text-gray-500">{erroConvite}</p>
          <p className="text-xs text-gray-400">
            Entre em contato com o administrador do sistema para obter um novo link de cadastro.
          </p>
        </motion.div>
      </div>
    );
  }

  if (fase === "sucesso") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4"
        >
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Cadastro realizado!</h1>
          <p className="text-sm text-gray-600">
            Seu cadastro foi enviado com sucesso. O administrador irá revisar e confirmar
            seu acesso. Você receberá uma notificação quando sua conta for aprovada.
          </p>
          <p className="text-xs text-gray-400 pt-2">
            Após a aprovação, acesse o sistema com seu e-mail e senha cadastrados.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <FolderKanban size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">SysGP</span>
          </div>
          <h1 className="text-xl font-bold">Cadastre-se no sistema</h1>
          {convite?.descricao && (
            <p className="text-blue-100 text-sm mt-1">{convite.descricao}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
            <input
              type="text"
              value={form.nomeCompleto}
              onChange={(e) => setForm(f => ({ ...f, nomeCompleto: e.target.value }))}
              required
              placeholder="Seu nome completo"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => setForm(f => ({ ...f, cpf: mascaraCPFInput(e.target.value) }))}
                required
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
              <input
                type="text"
                value={form.rg}
                onChange={(e) => setForm(f => ({ ...f, rg: e.target.value }))}
                placeholder="Opcional"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
            <input
              type="date"
              value={form.dataNasc}
              onChange={(e) => setForm(f => ({ ...f, dataNasc: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              required
              placeholder="seu@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
            <div className="relative">
              <input
                type={showSenha ? "text" : "password"}
                value={form.senha}
                onChange={(e) => setForm(f => ({ ...f, senha: e.target.value }))}
                required
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowSenha(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {form.senha && (
              <p className={`text-xs mt-1 ${forca.color}`}>Força: {forca.label}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha *</label>
            <input
              type="password"
              value={form.confirmarSenha}
              onChange={(e) => setForm(f => ({ ...f, confirmarSenha: e.target.value }))}
              required
              placeholder="Repita a senha"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Cadastrando...</>
            ) : "Realizar Cadastro"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Após o cadastro, sua conta precisa ser confirmada pelo administrador antes de você fazer login.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
