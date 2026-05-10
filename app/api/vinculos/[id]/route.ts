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

  return NextResponse.json(bigintToString(vinculo));
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

  if (session.perfil !== "ADMINISTRADOR") {
    const vinculoExist = await prisma.projetoMembro.findUnique({
      where: { id: vinculoId },
      select: { projetoId: true },
    });
    if (!vinculoExist) return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 });
    const pode = await podeGerenciarVinculo(session.id, vinculoExist.projetoId);
    if (!pode) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = membroProjetoSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const d = parsed.data;

  const vinculo = await prisma.projetoMembro.update({
    where: { id: vinculoId },
    data: {
      ...(d.funcao !== undefined && { funcao: d.funcao || null }),
      ...(d.isCoordenador !== undefined && { isCoordenador: d.isCoordenador }),
      ...(d.isBolsista !== undefined && { isBolsista: d.isBolsista }),
      ...(d.valorBolsa !== undefined && { valorBolsa: d.valorBolsa ? parseFloat(d.valorBolsa) : null }),
      ...(d.duracaoMeses !== undefined && { duracaoMeses: d.duracaoMeses }),
      ...(d.dataInicioBolsa !== undefined && { dataInicioBolsa: d.dataInicioBolsa ? new Date(d.dataInicioBolsa) : null }),
      ...(d.dataFimBolsa !== undefined && { dataFimBolsa: d.dataFimBolsa ? new Date(d.dataFimBolsa) : null }),
      ...(d.cargaHoraria !== undefined && { cargaHoraria: d.cargaHoraria }),
      ...(d.resultadosEsperados !== undefined && { resultadosEsperados: d.resultadosEsperados || null }),
      ...(d.cronograma !== undefined && { cronograma: d.cronograma || null }),
      ...(d.statusVinculo && { statusVinculo: d.statusVinculo as "ATIVO" | "ENCERRADO" | "SUSPENSO" }),
    },
    include: {
      projeto: { select: { id: true, titulo: true } },
      usuario: { select: { id: true, nomeCompleto: true, email: true } },
      metas: { orderBy: { ordem: "asc" } },
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

  return NextResponse.json(bigintToString(result));
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
