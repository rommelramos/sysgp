"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatarData, mascaraCPFInput, calcularForcaSenha } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

interface Usuario {
  id: string;
  nomeCompleto: string;
  cpf: string;
  email: string;
  perfil: string;
  ativo: boolean;
  createdAt: string;
  supervisor: { nomeCompleto: string } | null;
}

const perfilOpts = [
  { value: "MEMBRO", label: "Membro" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "ADMINISTRADOR", label: "Administrador" },
];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    nomeCompleto: "", cpf: "", rg: "", dataNasc: "", email: "",
    senha: "", confirmarSenha: "", perfil: "MEMBRO", supervisorId: "",
  });
  const [showSenha, setShowSenha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { user } = useAuth();

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usuarios?page=${page}&busca=${encodeURIComponent(busca)}`);
      const data = await res.json();
      setUsuarios(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, [page, busca]);

  useEffect(() => { carregar(); }, [carregar]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { toast("error", data.error || "Erro ao criar usuário"); return; }
    toast("success", "Usuário criado com sucesso!");
    setModalOpen(false);
    setForm({ nomeCompleto: "", cpf: "", rg: "", dataNasc: "", email: "", senha: "", confirmarSenha: "", perfil: "MEMBRO", supervisorId: "" });
    carregar();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !ativo }),
    });
    toast("success", `Usuário ${!ativo ? "ativado" : "inativado"}`);
    carregar();
  }

  const forca = calcularForcaSenha(form.senha);
  const pageSize = 25;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Usuários</h1>
          <p className="text-sm text-[var(--text-secondary)]">{total} usuário(s) encontrado(s)</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          Novo Usuário
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1); }}
            placeholder="Buscar por nome, e-mail ou CPF..."
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.25)] transition-all"
          />
        </div>
        <Button variant="ghost" icon={<RefreshCw size={14} />} onClick={carregar}>
          Atualizar
        </Button>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Nome", "E-mail", "CPF", "Perfil", "Supervisor", "Status", "Cadastro", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-[var(--text-secondary)]">Carregando...</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[var(--text-secondary)]">Nenhum usuário encontrado</td></tr>
              ) : (
                usuarios.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors ${i % 2 === 1 ? "bg-[rgba(26,34,53,0.3)]" : ""}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{u.nomeCompleto}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{u.email}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--text-secondary)]">{u.cpf}</td>
                    <td className="px-4 py-3"><Badge value={u.perfil} /></td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{u.supervisor?.nomeCompleto || "-"}</td>
                    <td className="px-4 py-3"><Badge value={u.ativo ? "ATIVO" : "ENCERRADO"} /></td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--text-secondary)]">{formatarData(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => toggleAtivo(u.id, u.ativo)}>
                        {u.ativo ? "Inativar" : "Ativar"}
                      </Button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-secondary)]">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Usuário" size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome Completo" value={form.nomeCompleto} onChange={(e) => setForm(f => ({ ...f, nomeCompleto: e.target.value }))} required />
            </div>
            <Input label="CPF" value={form.cpf} onChange={(e) => setForm(f => ({ ...f, cpf: mascaraCPFInput(e.target.value) }))} placeholder="000.000.000-00" required />
            <Input label="RG" value={form.rg} onChange={(e) => setForm(f => ({ ...f, rg: e.target.value }))} />
            <Input label="Data de Nascimento" type="date" value={form.dataNasc} onChange={(e) => setForm(f => ({ ...f, dataNasc: e.target.value }))} />
            <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
            <div className="relative">
              <Input
                label="Senha"
                type={showSenha ? "text" : "password"}
                value={form.senha}
                onChange={(e) => setForm(f => ({ ...f, senha: e.target.value }))}
                required
                rightIcon={
                  <button type="button" onClick={() => setShowSenha(!showSenha)}>
                    {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
              {form.senha && (
                <p className={`text-xs mt-1 ${forca.color}`}>Força: {forca.label}</p>
              )}
            </div>
            <Input label="Confirmar Senha" type="password" value={form.confirmarSenha} onChange={(e) => setForm(f => ({ ...f, confirmarSenha: e.target.value }))} required />
            <Select label="Perfil" value={form.perfil} onChange={(e) => setForm(f => ({ ...f, perfil: e.target.value }))} options={perfilOpts} required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Criar Usuário</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
