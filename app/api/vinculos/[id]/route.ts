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
    select: { id: true, titulo: true, dataInicio: true, dataFim: true, concluida: true },
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

  // Metas: update-in-place — delete removed (clearing FK refs first), update existing, create new
  if (d.metas !== undefined) {
    const idsMantidos = (d.metas ?? []).filter((m) => m.id).map((m) => BigInt(m.id!));

    const metasRemovidas = await prisma.meta.findMany({
      where: { projetoMembroId: vinculoId, ...(idsMantidos.length > 0 ? { NOT: { id: { in: idsMantidos } } } : {}) },
      select: { id: true },
    });
    if (metasRemovidas.length > 0) {
      const idsRemovidas = metasRemovidas.map((m: { id: bigint }) => m.id);
      await prisma.atividade.updateMany({ where: { metaId: { in: idsRemovidas } }, data: { metaId: null } });
      await prisma.meta.deleteMany({ where: { id: { in: idsRemovidas } } });
    }

    for (let i = 0; i < (d.metas ?? []).length; i++) {
      const m = d.metas![i];
      if (m.id) {
        await prisma.meta.update({ where: { id: BigInt(m.id) }, data: { descricao: m.descricao, ordem: i + 1 } });
      } else {
        await prisma.meta.create({ data: { projetoMembroId: vinculoId, descricao: m.descricao, ordem: i + 1 } });
      }
    }
  }

  // Atividades: update-in-place — delete removed, update existing (preserving concluida), create new
  if (d.cronograma !== undefined) {
    const idsEnviados = (d.cronograma ?? []).filter((c) => c.id).map((c) => BigInt(c.id!));

    await prisma.atividade.deleteMany({
      where: {
        projetoId: vinculoExist.projetoId,
        usuarioId: vinculoExist.usuarioId,
        ...(idsEnviados.length > 0 ? { NOT: { id: { in: idsEnviados } } } : {}),
      },
    });

    for (const c of (d.cronograma ?? []).filter((c) => c.nome?.trim())) {
      if (c.id) {
        await prisma.atividade.update({
          where: { id: BigInt(c.id) },
          data: {
            titulo: c.nome,
            dataInicio: c.dataInicio ? new Date(c.dataInicio) : null,
            dataFim: c.dataFim ? new Date(c.dataFim) : null,
            ...(c.concluida !== undefined && { concluida: c.concluida }),
          },
        });
      } else {
        await prisma.atividade.create({
          data: {
            projetoId: vinculoExist.projetoId,
            usuarioId: vinculoExist.usuarioId,
            titulo: c.nome,
            dataInicio: c.dataInicio ? new Date(c.dataInicio) : null,
            dataFim: c.dataFim ? new Date(c.dataFim) : null,
          },
        });
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
    select: { id: true, titulo: true, dataInicio: true, dataFim: true, concluida: true },
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
