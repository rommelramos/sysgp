import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { bigintToString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") || "ATIVO";
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const membrosWhere: Record<string, unknown> = {};
  if (statusFilter !== "TODOS") membrosWhere.statusVinculo = statusFilter;
  if (dataInicio) membrosWhere.dataInicioBolsa = { gte: new Date(dataInicio) };
  if (dataFim) membrosWhere.dataFimBolsa = { lte: new Date(dataFim) };

  const [projetos, membros] = await Promise.all([
    prisma.projeto.findMany({
      include: {
        coordenador: { select: { id: true, nomeCompleto: true, perfil: true } },
      },
    }),
    prisma.projetoMembro.findMany({
      where: membrosWhere,
      include: {
        usuario: { select: { id: true, nomeCompleto: true, perfil: true } },
        projeto: { select: { id: true, titulo: true } },
      },
    }),
  ]);

  // Build graph nodes and links
  const nodesMap = new Map<string, object>();
  const links: Array<{ source: string; target: string; tipo: string }> = [];

  projetos.forEach((p) => {
    nodesMap.set(`projeto_${p.id}`, {
      id: `projeto_${p.id}`,
      tipo: "PROJETO",
      label: p.titulo,
      status: p.status,
    });

    const supId = `supervisor_${p.coordenadorId}`;
    if (!nodesMap.has(supId)) {
      nodesMap.set(supId, {
        id: supId,
        tipo: "SUPERVISOR",
        label: p.coordenador.nomeCompleto,
        perfil: p.coordenador.perfil,
        usuarioId: String(p.coordenadorId),
      });
    }

    links.push({ source: supId, target: `projeto_${p.id}`, tipo: "COORDENA" });
  });

  membros.forEach((m) => {
    const membId = `membro_${m.usuarioId}`;
    if (!nodesMap.has(membId)) {
      nodesMap.set(membId, {
        id: membId,
        tipo: "MEMBRO",
        label: m.usuario.nomeCompleto,
        perfil: m.usuario.perfil,
        isBolsista: m.isBolsista,
        valorBolsa: m.valorBolsa,
        usuarioId: String(m.usuarioId),
      });
    }
    links.push({ source: membId, target: `projeto_${m.projetoId}`, tipo: m.isBolsista ? "BOLSISTA" : "MEMBRO" });
  });

  return NextResponse.json(
    bigintToString({ nodes: Array.from(nodesMap.values()), links })
  );
}
