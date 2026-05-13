import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { membroProjetoSchema } from "@/lib/validations/projeto";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { bigintToString } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const vinculo = await prisma.projetoMembro.findUnique({
    where: { id: BigInt(id) },
    include: {
      projeto: { select: { id: true, titulo: true, status: true } },
      usuario: { select: { id: true, nomeCompleto: true, email: true, perfil: true } },
      metas: { orderBy: { ordem: "asc" } },
    },
  });

  if (!vinculo) return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 });

  if (session.perfil === "MEMBRO" && String(vinculo.usuarioId) !== session.id)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const atividades = await prisma.atividade.findMany({
    where: { projetoId: vinculo.projetoId, usuarioId: vinculo.usuarioId },
    select: { id: true, titulo: true, dataInicio: true, dataFim: true },
    orderBy: [{ dataInicio: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(bigintToString({ ...vinculo, atividades }));
}

async function podeGerenciarVinculo(sessionId: string, projetoId: bigint): Promise<boolean> {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { coordenadorId: true },
  });
  if (!projeto) return false;
  if (projeto.coordenadorId === BigInt(sessionId)) return true;
  const membroCoord = await prisma.projetoMembro.findFirst({
    where: { projetoId, usuarioId: BigInt(sessionId), isCoordenador: true },
  });
  return !!membroCoord;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const vinculoId = BigInt(id);

  const vinculoExist = await prisma.projetoMembro.findUnique({
    where: { id: vinculoId },
    select: { projetoId: true, usuarioId: true },
  });
  if (!vinculoExist) return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 });

  if (session.perfil !== "ADMINISTRADOR") {
    const pode = await podeGerenciarVinculo(session.id, vinculoExist.projetoId);
    if (!pode) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = membroProjetoSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const d = parsed.data;

  await prisma.projetoMembro.update({
    where: { id: vinculoId },
    data: {
      ...(d.funcao !== undefined && { funcao: d.funcao || null }),
      ...(d.isCoordenador !== undefined && { isCoordenador: d.isCoordenador }),
      ...(d.isBolsista !== undefined && { isBolsista: d.isBolsista }),
      ...(d.valorBolsa !== undefined && { valorBolsa: d.valorBolsa ?? null }),
      ...(d.duracaoMeses !== undefined && { duracaoMeses: d.duracaoMeses }),
      ...(d.dataInicioBolsa !== undefined && { dataInicioBolsa: d.dataInicioBolsa ? new Date(d.dataInicioBolsa) : null }),
      ...(d.dataFimBolsa !== undefined && { dataFimBolsa: d.dataFimBolsa ? new Date(d.dataFimBolsa) : null }),
      ...(d.cargaHoraria !== undefined && { cargaHoraria: d.cargaHoraria }),
      ...(d.resultadosEsperados !== undefined && { resultadosEsperados: d.resultadosEsperados || null }),
      ...(d.statusVinculo && { statusVinculo: d.statusVinculo as "ATIVO" | "ENCERRADO" | "SUSPENSO" }),
    },
  });

  if (d.metas !== undefined) {
    await prisma.meta.deleteMany({ where: { projetoMembroId: vinculoId } });
    if (d.metas.length > 0) {
      await prisma.meta.createMany({
        data: d.metas.map((m, i) => ({
          projetoMembroId: vinculoId,
          descricao: m.descricao,
          ordem: i + 1,
        })),
      });
    }
  }

  // Sync activities: delete all member activities in this project and recreate from cronograma
  if (d.cronograma !== undefined) {
    await prisma.atividade.deleteMany({
      where: { projetoId: vinculoExist.projetoId, usuarioId: vinculoExist.usuarioId },
    });
    if (d.cronograma && d.cronograma.length > 0) {
      const atividadesData = d.cronograma
        .filter((c) => c.nome?.trim())
        .map((c) => ({
          projetoId: vinculoExist.projetoId,
          usuarioId: vinculoExist.usuarioId,
          titulo: c.nome,
          dataInicio: c.dataInicio ? new Date(c.dataInicio) : null,
          dataFim: c.dataFim ? new Date(c.dataFim) : null,
        }));
      if (atividadesData.length > 0) {
        await prisma.atividade.createMany({ data: atividadesData });
      }
    }
  }

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "UPDATE",
    entidade: "projeto_membros",
    entidadeId: vinculoId,
    ipAddress: extrairIP(req),
  });

  const result = await prisma.projetoMembro.findUnique({
    where: { id: vinculoId },
    include: {
      projeto: { select: { id: true, titulo: true } },
      usuario: { select: { id: true, nomeCompleto: true, email: true } },
      metas: { orderBy: { ordem: "asc" } },
    },
  });

  const atividades = await prisma.atividade.findMany({
    where: { projetoId: vinculoExist.projetoId, usuarioId: vinculoExist.usuarioId },
    select: { id: true, titulo: true, dataInicio: true, dataFim: true },
    orderBy: [{ dataInicio: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(bigintToString({ ...result, atividades }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.perfil !== "ADMINISTRADOR")
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  await prisma.projetoMembro.delete({ where: { id: BigInt(id) } });

  return NextResponse.json({ ok: true });
}
