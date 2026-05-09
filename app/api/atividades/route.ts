import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { atividadeSchema } from "@/lib/validations/projeto";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { bigintToString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");
  const projetoId = searchParams.get("projetoId");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const where: Record<string, unknown> = {};

  if (session.perfil === "MEMBRO") {
    where.usuarioId = BigInt(session.id);
  } else if (session.perfil === "SUPERVISOR") {
    const projetos = await prisma.projetoMembro.findMany({
      where: { usuarioId: BigInt(session.id) },
      select: { projetoId: true },
    });
    where.projetoId = { in: projetos.map((p: { projetoId: bigint }) => p.projetoId) };
  }

  if (projetoId) where.projetoId = BigInt(projetoId);
  if (dataInicio || dataFim) {
    where.dataInicio = {};
    if (dataInicio) (where.dataInicio as Record<string, Date>).gte = new Date(dataInicio);
    if (dataFim) (where.dataInicio as Record<string, Date>).lte = new Date(dataFim);
  }

  const [total, atividades] = await Promise.all([
    prisma.atividade.count({ where }),
    prisma.atividade.findMany({
      where,
      include: {
        projeto: { select: { id: true, titulo: true } },
        usuario: { select: { id: true, nomeCompleto: true } },
        documentos: { select: { id: true, nomeOriginal: true, mimeType: true, tamanhoBytes: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json(
    bigintToString({ data: atividades, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = atividadeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { projetoId, titulo, descricao, dataInicio, dataFim } = parsed.data;

  const vinculo = await prisma.projetoMembro.findFirst({
    where: { projetoId: BigInt(projetoId), usuarioId: BigInt(session.id), statusVinculo: "ATIVO" },
  });

  if (!vinculo && session.perfil !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Você não está vinculado a este projeto" }, { status: 403 });
  }

  const atividade = await prisma.atividade.create({
    data: {
      projetoId: BigInt(projetoId),
      usuarioId: BigInt(session.id),
      titulo,
      descricao: descricao || null,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataFim: dataFim ? new Date(dataFim) : null,
    },
    include: {
      projeto: { select: { id: true, titulo: true } },
      usuario: { select: { id: true, nomeCompleto: true } },
    },
  });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "CREATE",
    entidade: "atividades",
    entidadeId: atividade.id,
    ipAddress: extrairIP(req),
  });

  return NextResponse.json(bigintToString(atividade), { status: 201 });
}
