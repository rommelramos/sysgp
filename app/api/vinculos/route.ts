import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { membroProjetoSchema } from "@/lib/validations/projeto";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { bigintToString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projetoId = searchParams.get("projetoId");
  const usuarioId = searchParams.get("usuarioId");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 50;

  const where: Record<string, unknown> = {};

  if (session.perfil === "MEMBRO") {
    where.usuarioId = BigInt(session.id);
  } else if (session.perfil === "SUPERVISOR") {
    where.OR = [
      { usuarioId: BigInt(session.id) },
      { projeto: { coordenadorId: BigInt(session.id) } },
    ];
  }

  if (projetoId) where.projetoId = BigInt(projetoId);
  if (usuarioId) where.usuarioId = BigInt(usuarioId);
  if (status) where.statusVinculo = status;

  const [total, vinculos] = await Promise.all([
    prisma.projetoMembro.count({ where }),
    prisma.projetoMembro.findMany({
      where,
      include: {
        projeto: { select: { id: true, titulo: true, status: true } },
        usuario: { select: { id: true, nomeCompleto: true, email: true, perfil: true } },
        metas: { orderBy: { ordem: "asc" } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json(bigintToString({ data: vinculos, total, page, pageSize }));
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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const bodyWithProject = body as { projetoId?: string } & Record<string, unknown>;
  if (!bodyWithProject.projetoId) return NextResponse.json({ error: "Projeto obrigatório" }, { status: 422 });

  const projetoId = BigInt(bodyWithProject.projetoId);

  if (session.perfil !== "ADMINISTRADOR") {
    const pode = await podeGerenciarVinculo(session.id, projetoId);
    if (!pode) return NextResponse.json({ error: "Apenas o administrador ou o coordenador do projeto pode registrar vínculos" }, { status: 403 });
  }

  const parsed = membroProjetoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const d = parsed.data;

  if (d.isCoordenador) {
    await prisma.projetoMembro.updateMany({
      where: { projetoId, isCoordenador: true },
      data: { isCoordenador: false },
    });
  }

  const vinculo = await prisma.projetoMembro.upsert({
    where: { projetoId_usuarioId: { projetoId, usuarioId: BigInt(d.usuarioId) } },
    create: {
      projetoId,
      usuarioId: BigInt(d.usuarioId),
      funcao: d.funcao || null,
      isCoordenador: d.isCoordenador,
      isBolsista: d.isBolsista,
      valorBolsa: d.valorBolsa ?? null,
      duracaoMeses: d.duracaoMeses || null,
      dataInicioBolsa: d.dataInicioBolsa ? new Date(d.dataInicioBolsa) : null,
      dataFimBolsa: d.dataFimBolsa ? new Date(d.dataFimBolsa) : null,
      cargaHoraria: d.cargaHoraria || null,
      resultadosEsperados: d.resultadosEsperados || null,
      cronograma: d.cronograma || null,
      statusVinculo: d.statusVinculo as "ATIVO" | "ENCERRADO" | "SUSPENSO",
    },
    update: {
      funcao: d.funcao || null,
      isCoordenador: d.isCoordenador,
      isBolsista: d.isBolsista,
      valorBolsa: d.valorBolsa ?? null,
      duracaoMeses: d.duracaoMeses || null,
      dataInicioBolsa: d.dataInicioBolsa ? new Date(d.dataInicioBolsa) : null,
      dataFimBolsa: d.dataFimBolsa ? new Date(d.dataFimBolsa) : null,
      cargaHoraria: d.cargaHoraria || null,
      resultadosEsperados: d.resultadosEsperados || null,
      cronograma: d.cronograma || null,
      statusVinculo: d.statusVinculo as "ATIVO" | "ENCERRADO" | "SUSPENSO",
    },
    include: {
      projeto: { select: { id: true, titulo: true } },
      usuario: { select: { id: true, nomeCompleto: true, email: true } },
      metas: true,
    },
  });

  if (d.metas && d.metas.length > 0) {
    await prisma.meta.deleteMany({ where: { projetoMembroId: vinculo.id } });
    await prisma.meta.createMany({
      data: d.metas.map((m, i) => ({
        projetoMembroId: vinculo.id,
        descricao: m.descricao,
        ordem: i + 1,
      })),
    });
  }

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "CREATE",
    entidade: "projeto_membros",
    entidadeId: vinculo.id,
    ipAddress: extrairIP(req),
  });

  const result = await prisma.projetoMembro.findUnique({
    where: { id: vinculo.id },
    include: {
      projeto: { select: { id: true, titulo: true } },
      usuario: { select: { id: true, nomeCompleto: true, email: true } },
      metas: { orderBy: { ordem: "asc" } },
    },
  });

  return NextResponse.json(bigintToString(result), { status: 201 });
}
