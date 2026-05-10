"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Select } from "@/components/ui/Select";
import { formatarMoeda } from "@/lib/utils";

interface Node {
  id: string;
  tipo: "SUPERVISOR" | "PROJETO" | "MEMBRO";
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

interface Link {
  source: string | Node;
  target: string | Node;
  tipo: string;
}

export default function RelacoesPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [statusFilter, setStatusFilter] = useState("ATIVO");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    fetch(`/api/relacoes?status=${statusFilter}`)
      .then((r) => r.json())
      .then(({ nodes, links }) => renderGraph(nodes, links));
  }, [statusFilter]);

  function renderGraph(nodes: Node[], links: Link[]) {
    if (!svgRef.current) return;
    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g");

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(50));

    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => d.tipo === "BOLSISTA" ? "#10B981" : "#1E293B")
      .attr("stroke-width", (d) => d.tipo === "COORDENA" ? 2 : 1)
      .attr("stroke-dasharray", (d) => d.tipo === "MEMBRO" ? "4,2" : "none")
      .attr("stroke-opacity", 0.7);

    const nodeGroup = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer") as d3.Selection<SVGGElement, Node, SVGGElement, unknown>;

    nodeGroup.call(
      d3.drag<SVGGElement, Node>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    nodeGroup.each(function (d) {
      const el = d3.select(this);
      if (d.tipo === "SUPERVISOR") {
        el.append("polygon")
          .attr("points", "0,-22 19,-11 19,11 0,22 -19,11 -19,-11")
          .attr("fill", "rgba(6,182,212,0.15)")
          .attr("stroke", "#06B6D4")
          .attr("stroke-width", 2);
      } else if (d.tipo === "PROJETO") {
        el.append("rect")
          .attr("x", -40).attr("y", -18).attr("width", 80).attr("height", 36)
          .attr("rx", 8)
          .attr("fill", "rgba(37,99,235,0.15)")
          .attr("stroke", "#2563EB")
          .attr("stroke-width", 2);
      } else {
        el.append("circle")
          .attr("r", 18)
          .attr("fill", "rgba(148,163,184,0.1)")
          .attr("stroke", d.isBolsista ? "#10B981" : "#94A3B8")
          .attr("stroke-width", d.isBolsista ? 2.5 : 1.5);
      }

      el.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", d.tipo === "PROJETO" ? "0.35em" : "0.35em")
        .attr("fill", d.tipo === "SUPERVISOR" ? "#06B6D4" : d.tipo === "PROJETO" ? "#60A5FA" : "#94A3B8")
        .attr("font-size", "9px")
        .attr("font-family", "Inter, sans-serif")
        .text(d.label.length > 14 ? d.label.slice(0, 14) + "…" : d.label);
    });

    nodeGroup
      .on("mouseover", function (event, d) {
        let content = `<strong>${d.label}</strong><br/>Tipo: ${d.tipo}`;
        if (d.valorBolsa) content += `<br/>Bolsa: ${formatarMoeda(d.valorBolsa)}/mês`;
        setTooltip({ x: event.pageX + 12, y: event.pageY - 10, content });
      })
      .on("mousemove", function (event) {
        setTooltip((t) => t ? { ...t, x: event.pageX + 12, y: event.pageY - 10 } : null);
      })
      .on("mouseout", () => setTooltip(null));

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);
      nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
  }

  return (
    <div className="space-y-4 h-full flex flex-col" style={{ marginLeft: '5px' }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <div style={{ marginLeft: '5px' }}>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Relações</h1>
          <p className="text-sm text-[var(--text-secondary)]">Grafo interativo de supervisores, projetos e bolsistas</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[rgba(37,99,235,0.3)] border border-blue-400 inline-block" />Projeto</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-cyan-400 bg-[rgba(6,182,212,0.15)] inline-block" />Supervisor</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-emerald-400 bg-[rgba(16,185,129,0.1)] inline-block" />Bolsista</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-slate-400 bg-[rgba(148,163,184,0.1)] inline-block" />Membro</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-primary)]"
          >
            <option value="ATIVO">Ativos</option>
            <option value="ENCERRADO">Encerrados</option>
            <option value="TODOS">Todos</option>
          </select>
        </div>
      </div>

      <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden relative min-h-[500px]">
        <svg ref={svgRef} className="w-full h-full" />
        {tooltip && (
          <div
            className="fixed z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] pointer-events-none shadow-xl"
            style={{ left: tooltip.x, top: tooltip.y }}
            dangerouslySetInnerHTML={{ __html: tooltip.content }}
          />
        )}
      </div>
    </div>
  );
}
