"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { formatarMoeda } from "@/lib/utils";

interface GraphNode {
  id: string;
  tipo: "SUPERVISOR" | "PROJETO" | "MEMBRO" | "BOLSISTA";
  label: string;
  perfil?: string;
  isBolsista?: boolean;
  valorBolsa?: number | null;
  status?: string;
  usuarioId?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  tipo: string;
}

interface ProjetoOption {
  id: string;
  titulo: string;
  status: string;
}

const PROJETO_STATUS_OPTS = [
  { value: "TODOS", label: "Todos os status" },
  { value: "ANDAMENTO", label: "Em andamento" },
  { value: "PLANEJAMENTO", label: "Planejamento" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "SUSPENSO", label: "Suspenso" },
  { value: "CANCELADO", label: "Cancelado" },
];

const VINCULO_STATUS_OPTS = [
  { value: "ATIVO", label: "Ativos" },
  { value: "ENCERRADO", label: "Encerrados" },
  { value: "SUSPENSO", label: "Suspensos" },
  { value: "TODOS", label: "Todos" },
];

export default function RelacoesPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [modo, setModo] = useState<"projeto" | "bolsista">("projeto");
  const [projetoStatus, setProjetoStatus] = useState("TODOS");
  const [vinculoStatus, setVinculoStatus] = useState("ATIVO");
  const [allProjetos, setAllProjetos] = useState<ProjetoOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilter, setShowFilter] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);

  useEffect(() => {
    fetch("/api/projetos?pageSize=200")
      .then((r) => r.json())
      .then((d) =>
        setAllProjetos(
          (d.data || []).map((p: { id: string; titulo: string; status: string }) => ({
            id: p.id,
            titulo: p.titulo,
            status: p.status,
          }))
        )
      )
      .catch(() => {});
  }, []);

  const renderGraph = useCallback(
    (rawNodes: GraphNode[], rawLinks: GraphLink[], currentModo: string) => {
      if (!svgRef.current) return;
      const container = svgRef.current.parentElement!;
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 500;

      d3.select(svgRef.current).selectAll("*").remove();
      const svg = d3.select(svgRef.current).attr("width", width).attr("height", height);
      const g = svg.append("g");

      svg.call(
        d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.15, 4])
          .on("zoom", (event) => g.attr("transform", event.transform))
      );

      const simulation = d3
        .forceSimulation<GraphNode>(rawNodes)
        .force("link", d3.forceLink<GraphNode, GraphLink>(rawLinks).id((d) => d.id).distance(140))
        .force("charge", d3.forceManyBody().strength(-380))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide(58));

      const link = g
        .append("g")
        .selectAll("line")
        .data(rawLinks)
        .join("line")
        .attr("stroke", (d) =>
          d.tipo === "BOLSISTA" ? "#10B981" : d.tipo === "COORDENA" ? "#3B82F6" : "#64748B"
        )
        .attr("stroke-width", (d) => (d.tipo === "COORDENA" ? 2.5 : 1.5))
        .attr("stroke-dasharray", (d) => (d.tipo === "MEMBRO" ? "4,3" : "none"))
        .attr("stroke-opacity", 0.65);

      const nodeGroup = g
        .append("g")
        .selectAll<SVGGElement, GraphNode>("g")
        .data(rawNodes)
        .join("g")
        .style("cursor", "pointer");

      nodeGroup.call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

      nodeGroup.each(function (d) {
        const el = d3.select(this);
        switch (d.tipo) {
          case "SUPERVISOR":
            el.append("polygon")
              .attr("points", "0,-22 19,-11 19,11 0,22 -19,11 -19,-11")
              .attr("fill", "rgba(6,182,212,0.15)")
              .attr("stroke", "#06B6D4")
              .attr("stroke-width", 2);
            break;
          case "PROJETO":
            el.append("rect")
              .attr("x", -44).attr("y", -18).attr("width", 88).attr("height", 36).attr("rx", 8)
              .attr("fill", currentModo === "bolsista" ? "rgba(99,102,241,0.15)" : "rgba(37,99,235,0.15)")
              .attr("stroke", currentModo === "bolsista" ? "#6366F1" : "#2563EB")
              .attr("stroke-width", 2);
            break;
          case "BOLSISTA":
            el.append("circle")
              .attr("r", 22)
              .attr("fill", "rgba(16,185,129,0.15)")
              .attr("stroke", "#10B981")
              .attr("stroke-width", 2.5);
            break;
          default:
            el.append("circle")
              .attr("r", 18)
              .attr("fill", "rgba(148,163,184,0.1)")
              .attr("stroke", d.isBolsista ? "#10B981" : "#94A3B8")
              .attr("stroke-width", d.isBolsista ? 2.5 : 1.5);
        }

        const fill =
          d.tipo === "SUPERVISOR"
            ? "#67E8F9"
            : d.tipo === "PROJETO"
            ? currentModo === "bolsista"
              ? "#A5B4FC"
              : "#93C5FD"
            : d.tipo === "BOLSISTA"
            ? "#6EE7B7"
            : d.isBolsista
            ? "#6EE7B7"
            : "#94A3B8";

        el.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("fill", fill)
          .attr("font-size", "9px")
          .attr("font-family", "Inter, sans-serif")
          .text(d.label.length > 14 ? d.label.slice(0, 14) + "…" : d.label);
      });

      nodeGroup
        .on("mouseover", function (event, d) {
          let html = `<strong>${d.label}</strong>`;
          if (d.tipo === "SUPERVISOR")
            html += `<br/><span style="opacity:0.65;font-size:10px">Coordenador</span>`;
          if (d.status)
            html += `<br/><span style="opacity:0.65;font-size:10px">Status: ${d.status}</span>`;
          if (d.valorBolsa)
            html += `<br/><span style="color:#10B981;font-size:10px">Bolsa: ${formatarMoeda(d.valorBolsa)}/mês</span>`;
          setTooltip({ x: event.pageX + 14, y: event.pageY - 10, html });
        })
        .on("mousemove", function (event) {
          setTooltip((t) => (t ? { ...t, x: event.pageX + 14, y: event.pageY - 10 } : null));
        })
        .on("mouseout", () => setTooltip(null));

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => (d.source as GraphNode).x!)
          .attr("y1", (d) => (d.source as GraphNode).y!)
          .attr("x2", (d) => (d.target as GraphNode).x!)
          .attr("y2", (d) => (d.target as GraphNode).y!);
        nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });
    },
    []
  );

  useEffect(() => {
    const params = new URLSearchParams({ modo, vinculoStatus, projetoStatus });
    if (selectedIds.size > 0) params.set("projetoIds", [...selectedIds].join(","));
    fetch(`/api/relacoes?${params}`)
      .then((r) => r.json())
      .then(({ nodes, links }) => renderGraph(nodes, links, modo))
      .catch(() => {});
  }, [modo, vinculoStatus, projetoStatus, selectedIds, renderGraph]);

  function toggleProject(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.size === 0) {
        allProjetos.forEach((p) => { if (p.id !== id) next.add(p.id); });
      } else if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) return new Set();
      } else {
        next.add(id);
        if (next.size === allProjetos.length) return new Set();
      }
      return next;
    });
  }

  const displayedProjetos = allProjetos.filter((p) =>
    p.titulo.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <div className="space-y-4 h-full flex flex-col" style={{ marginLeft: "5px" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div style={{ marginLeft: "5px" }}>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Relações</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {modo === "projeto"
              ? "Projetos como nó raiz — coordenadores e membros ao redor"
              : "Bolsistas como nó raiz — projetos vinculados ao redor"}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
          <button
            onClick={() => setModo("projeto")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              modo === "projeto"
                ? "bg-[var(--accent-primary)] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Por Projeto
          </button>
          <button
            onClick={() => setModo("bolsista")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              modo === "bolsista"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Por Bolsista
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap flex-shrink-0" style={{ marginLeft: "5px" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] font-medium whitespace-nowrap">
            Status do vínculo:
          </span>
          <select
            value={vinculoStatus}
            onChange={(e) => setVinculoStatus(e.target.value)}
            className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent-primary)]"
          >
            {VINCULO_STATUS_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {modo === "projeto" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-medium whitespace-nowrap">
                Status do projeto:
              </span>
              <select
                value={projetoStatus}
                onChange={(e) => setProjetoStatus(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent-primary)]"
              >
                {PROJETO_STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowFilter((f) => !f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                showFilter || selectedIds.size > 0
                  ? "border-[var(--accent-primary)] text-[var(--accent-primary)] bg-blue-50"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13" height="13"
                viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {selectedIds.size > 0 ? `${selectedIds.size} projeto(s)` : "Filtrar projetos"}
            </button>
          </>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] ml-auto flex-wrap">
          {modo === "projeto" ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[rgba(37,99,235,0.3)] border border-blue-400 inline-block" />
                Projeto
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-cyan-400 bg-[rgba(6,182,212,0.15)] inline-block" />
                Coordenador
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-[rgba(16,185,129,0.1)] inline-block" />
                Bolsista
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-slate-400 bg-[rgba(148,163,184,0.1)] inline-block" />
                Membro
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-[rgba(16,185,129,0.15)] inline-block" />
                Bolsista
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[rgba(99,102,241,0.3)] border border-indigo-400 inline-block" />
                Projeto
              </span>
            </>
          )}
        </div>
      </div>

      {/* Project selector panel */}
      {showFilter && modo === "projeto" && (
        <div
          className="flex-shrink-0 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 space-y-3"
          style={{ marginLeft: "5px" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Selecionar Projetos
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-[var(--accent-primary)] hover:underline"
            >
              Mostrar todos
            </button>
          </div>
          <input
            type="text"
            placeholder="Buscar projeto..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent-primary)]"
          />
          {displayedProjetos.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-2">
              Nenhum projeto encontrado
            </p>
          ) : (
            <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
              {displayedProjetos.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.size === 0 || selectedIds.has(p.id)}
                    onChange={() => toggleProject(p.id)}
                    className="w-3.5 h-3.5 accent-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
                    {p.titulo}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-mono">
                    {p.status}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Graph */}
      <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden relative min-h-[400px]">
        <svg ref={svgRef} className="w-full h-full" />
        {tooltip && (
          <div
            className="fixed z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] pointer-events-none shadow-xl max-w-[220px]"
            style={{ left: tooltip.x, top: tooltip.y }}
            dangerouslySetInnerHTML={{ __html: tooltip.html }}
          />
        )}
      </div>
    </div>
  );
}
