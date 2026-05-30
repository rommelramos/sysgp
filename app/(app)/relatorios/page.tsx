"use client";

import { useEffect, useState } from "react";
import { FileText, FileDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";

interface Projeto {
  id: string;
  titulo: string;
  membros: Array<{ usuarioId: string; usuario: { nomeCompleto: string } }>;
}

export default function RelatoriosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [membros, setMembros] = useState<Array<{ usuarioId: string; usuario: { nomeCompleto: string } }>>([]);
  const [selectedMembros, setSelectedMembros] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [formato, setFormato] = useState<"HTML" | "PDF">("PDF");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetch("/api/projetos?pageSize=100")
      .then((r) => r.json())
      .then((d) => setProjetos(d.data || []));
  }, []);

  useEffect(() => {
    if (!projetoId) return;
    fetch(`/api/projetos/${projetoId}`)
      .then((r) => r.json())
      .then((d) => {
        setMembros(d.membros || []);
        if (user?.perfil === "MEMBRO") {
          setSelectedMembros([user.id]);
        } else {
          setSelectedMembros([]);
        }
      });
  }, [projetoId, user]);

  function toggleMembro(id: string) {
    if (user?.perfil === "MEMBRO") return;
    setSelectedMembros((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  async function gerarRelatorio() {
    if (!projetoId || !dataInicio || !dataFim || selectedMembros.length === 0) {
      toast("warning", "Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/relatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projetoId, usuarioIds: selectedMembros, dataInicio, dataFim, formato }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast("error", data.error || "Erro ao gerar relatório");
        return;
      }
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      // Open in new tab; for PDF format the page auto-triggers print dialog
      window.open(url, "_blank");
      // Revoke after enough time for the new tab to load
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast("success", formato === "PDF" ? "Relatório aberto — use Ctrl+P para salvar como PDF" : "Relatório gerado!");
    } catch {
      toast("error", "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl" style={{ marginLeft: '5px' }}>
      <div style={{ marginLeft: '5px' }}>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Relatórios</h1>
        <p className="text-sm text-[var(--text-secondary)]">Gere relatórios periódicos de atividades</p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-[var(--accent-primary)]" style={{ marginLeft: '5px' }}>
          <FileText size={18} />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Configurar Relatório</h2>
        </div>

        <Select
          label="Projeto"
          value={projetoId}
          onChange={(e) => setProjetoId(e.target.value)}
          options={projetos.map((p) => ({ value: p.id, label: p.titulo }))}
          placeholder="Selecione um projeto..."
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Período — Início" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
          <Input label="Período — Fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} required />
        </div>

        {membros.length > 0 && (
          <div style={{ marginLeft: '5px' }}>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
              Membros {user?.perfil !== "MEMBRO" && "(selecione)"}
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {membros.map((m) => (
                <label
                  key={m.usuarioId}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] cursor-pointer hover:border-[var(--accent-primary)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembros.includes(m.usuarioId)}
                    onChange={() => toggleMembro(m.usuarioId)}
                    disabled={user?.perfil === "MEMBRO"}
                    className="accent-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{m.usuario.nomeCompleto}</span>
                </label>
              ))}
            </div>
            {user?.perfil !== "MEMBRO" && (
              <div className="flex gap-2 mt-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedMembros(membros.map((m) => m.usuarioId))}>
                  Todos
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMembros([])}>
                  Nenhum
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Format selector */}
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Formato de saída</p>
          <div className="grid grid-cols-2 gap-2">
            {(["PDF", "HTML"] as const).map((fmt) => {
              const active = formato === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormato(fmt)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all
                    ${active
                      ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-sm"
                      : "bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                    }`}
                >
                  {fmt === "PDF"
                    ? <FileDown size={15} />
                    : <Globe size={15} />}
                  {fmt === "PDF" ? "PDF" : "HTML"}
                  {fmt === "PDF" && (
                    <span className={`text-[10px] font-normal ml-0.5 ${active ? "text-blue-100" : "text-[var(--text-muted)]"}`}>
                      (Ctrl+P)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            {formato === "PDF"
              ? "Abre o relatório e exibe automaticamente o diálogo de impressão para salvar como PDF."
              : "Abre o relatório como página HTML em nova aba — pode salvar o arquivo ou imprimir manualmente."}
          </p>
        </div>

        <Button
          onClick={gerarRelatorio}
          loading={loading}
          icon={formato === "PDF" ? <FileDown size={16} /> : <Globe size={16} />}
          className="w-full"
        >
          {formato === "PDF" ? "Gerar PDF" : "Gerar HTML"}
        </Button>
      </div>
    </div>
  );
}
