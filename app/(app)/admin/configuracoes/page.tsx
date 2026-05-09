"use client";

import { useState, useEffect } from "react";
import { Database, Shield, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatarData } from "@/lib/utils";

interface AuditEntry {
  id: string;
  acao: string;
  entidade: string | null;
  ipAddress: string | null;
  createdAt: string;
  usuario: { nomeCompleto: string; email: string } | null;
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState({ host: "", porta: "3306", nome: "", usuario: "", senha: "" });
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [testeOk, setTesteOk] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/admin/audit-log?page=${page}`)
      .then((r) => r.json())
      .then((d) => { setLogs(d.data || []); setTotal(d.total || 0); });
  }, [page]);

  async function testarConexao() {
    setTestandoConexao(true);
    setTesteOk(null);
    try {
      const res = await fetch("/api/admin/configuracoes/testar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setTesteOk(res.ok && data.ok);
      if (res.ok && data.ok) toast("success", "Conexão bem-sucedida!");
      else toast("error", data.error || "Falha na conexão");
    } catch {
      setTesteOk(false);
      toast("error", "Erro ao testar conexão");
    } finally {
      setTestandoConexao(false);
    }
  }

  async function salvarConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!testeOk) { toast("warning", "Teste a conexão antes de salvar"); return; }
    setSalvando(true);
    const res = await fetch("/api/admin/configuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSalvando(false);
    if (res.ok) toast("success", "Configurações salvas!");
    else toast("error", "Erro ao salvar");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configurações</h1>
        <p className="text-sm text-[var(--text-secondary)]">Painel administrativo do sistema</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* DB Config */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Database size={18} className="text-[var(--accent-primary)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Configuração do Banco de Dados</h2>
          </div>
          <form onSubmit={salvarConfig} className="space-y-4">
            <Input label="Host / Servidor" value={config.host} onChange={(e) => setConfig(c => ({ ...c, host: e.target.value }))} placeholder="localhost" required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Porta" type="number" value={config.porta} onChange={(e) => setConfig(c => ({ ...c, porta: e.target.value }))} />
              <Input label="Nome do Banco" value={config.nome} onChange={(e) => setConfig(c => ({ ...c, nome: e.target.value }))} required />
            </div>
            <Input label="Usuário" value={config.usuario} onChange={(e) => setConfig(c => ({ ...c, usuario: e.target.value }))} required />
            <Input label="Senha" type="password" value={config.senha} onChange={(e) => setConfig(c => ({ ...c, senha: e.target.value }))} required />

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={testarConexao} loading={testandoConexao}>
                Testar Conexão
              </Button>
              {testeOk === true && <span className="flex items-center gap-1 text-emerald-400 text-sm"><CheckCircle size={14} />Conectado</span>}
              {testeOk === false && <span className="text-red-400 text-sm">Falha na conexão</span>}
            </div>
            <Button type="submit" loading={salvando} className="w-full">Salvar Configurações</Button>
          </form>
        </div>

        {/* Audit Log */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--border)]">
            <Shield size={18} className="text-[var(--accent-secondary)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Log de Auditoria</h2>
            <span className="ml-auto text-xs text-[var(--text-secondary)]">{total} registros</span>
          </div>
          <div className="overflow-y-auto max-h-80 divide-y divide-[var(--border)]">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-2.5 hover:bg-[var(--bg-elevated)] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{log.acao}</span>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">{formatarData(log.createdAt)}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {log.usuario?.nomeCompleto || "Sistema"} • {log.entidade || "—"} • {log.ipAddress || "—"}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 px-4 py-3 border-t border-[var(--border)]">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
