import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { bigintToString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const modo = searchParams.get("modo") || "projeto";
  const vinculoStatus = searchParams.get("vinculoStatus") || "ATIVO";
  const projetoStatus = searchParams.get("projetoStatus") || "TODOS";
  const projetoIdsParam = searchParams.get("projetoIds") || "";

  const projetoWhere: Record<string, unknown> = {};
  if (projetoStatus !== "TODOS") projetoWhere.status = projetoStatus;

  const projetoIdsFilter = projetoIdsParam
    ? projetoIdsParam.split(",").filter(Boolean).map((id) => BigInt(id))
    : [];
  if (projetoIdsFilter.length > 0) projetoWhere.id = { in: projetoIdsFilter };

  const vinculoWhere: Record<string, unknown> = {};
  if (vinculoStatus !== "TODOS") vinculoWhere.statusVinculo = vinculoStatus;
  if (modo === "bolsista") vinculoWhere.isBolsista = true;

  const [projetos, membros] = await Promise.all([
    prisma.projeto.findMany({
      where: projetoWhere,
      include: {
        coordenador: { select: { id: true, nomeCompleto: true, perfil: true } },
      },
      orderBy: { titulo: "asc" },
    }),
    prisma.projetoMembro.findMany({
      where: vinculoWhere,
      include: {
        usuario: { select: { id: true, nomeCompleto: true, perfil: true } },
        projeto: { select: { id: true, titulo: true, status: true } },
      },
    }),
  ]);

  const projetoIdsSet = new Set(projetos.map((p) => String(p.id)));
  const filteredMembros = membros.filter((m) => projetoIdsSet.has(String(m.projetoId)));

  const nodes: Array<Record<string, unknown>> = [];
  const links: Array<{ source: string; target: string; tipo: string }> = [];
  const seen = new Set<string>();

  function addNode(node: Record<string, unknown>) {
    if (!seen.has(node.id as string)) {
      seen.add(node.id as string);
      nodes.push(node);
    }
  }

  if (modo === "bolsista") {
    filteredMembros.forEach((m) => {
      addNode({
        id: `bolsista_${m.usuarioId}`,
        tipo: "BOLSISTA",
        label: m.usuario.nomeCompleto,
        usuarioId: String(m.usuarioId),
      });

      // Per-bolsista project node so tooltip shows the correct bolsa for this link
      addNode({
        id: `proj_${m.projetoId}_b_${m.usuarioId}`,
        tipo: "PROJETO",
        label: m.projeto.titulo,
        status: m.projeto.status,
        valorBolsa: m.valorBolsa,
      });

      links.push({
        source: `bolsista_${m.usuarioId}`,
        target: `proj_${m.projetoId}_b_${m.usuarioId}`,
        tipo: "BOLSISTA",
      });
    });
  } else {
    projetos.forEach((p) => {
      addNode({ id: `projeto_${p.id}`, tipo: "PROJETO", label: p.titulo, status: p.status });
      addNode({
        id: `supervisor_${p.coordenadorId}`,
        tipo: "SUPERVISOR",
        label: p.coordenador.nomeCompleto,
        perfil: p.coordenador.perfil,
        usuarioId: String(p.coordenadorId),
      });
      links.push({ source: `supervisor_${p.coordenadorId}`, target: `projeto_${p.id}`, tipo: "COORDENA" });
    });

    filteredMembros.forEach((m) => {
      addNode({
        id: `vinculo_${m.id}`,
        tipo: "MEMBRO",
        label: m.usuario.nomeCompleto,
        perfil: m.usuario.perfil,
        isBolsista: m.isBolsista,
        valorBolsa: m.valorBolsa,
        usuarioId: String(m.usuarioId),
      });
      links.push({
        source: `vinculo_${m.id}`,
        target: `projeto_${m.projetoId}`,
        tipo: m.isBolsista ? "BOLSISTA" : "MEMBRO",
      });
    });
  }

  return NextResponse.json(bigintToString({ nodes, links }));
}
