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
  const filtroUsuarioId = searchParams.get("usuarioId");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");
  const concluida = searchParams.get("concluida");

  const where: Record<string, unknown> = {};

  // Role-based base filter — applied unconditionally
  if (session.perfil === "MEMBRO") {
    // Always restricted to own activities only
    where.usuarioId = BigInt(session.id);
  } else if (session.perfil === "SUPERVISOR") {
    // Own activities + activities of users supervised by this supervisor
    where.OR = [
      { usuarioId: BigInt(session.id) },
      { usuario: { supervisorId: BigInt(session.id) } },
    ];
  }
  // ADMINISTRADOR: no restriction

  if (projetoId) where.projetoId = BigInt(projetoId);

  // filtroUsuarioId is only applied for SUPERVISOR/ADMIN (MEMBRO is already locked to self)
  if (filtroUsuarioId && session.perfil !== "MEMBRO") {
    if (session.perfil === "SUPERVISOR") {
      // Validate the requested user is supervised by this supervisor or is themselves
      if (filtroUsuarioId !== session.id) {
        const target = await prisma.usuario.findUnique({
          where: { id: BigInt(filtroUsuarioId) },
          select: { supervisorId: true },
        });
        if (!target || String(target.supervisorId) !== session.id) {
          // Not supervised — return empty results without leaking information
          return NextResponse.json(
            bigintToString({ data: [], total: 0, page, pageSize, totalPages: 0 })
          );
        }
      }
      // Replace the OR restriction with the specific user
      delete where.OR;
      where.usuarioId = BigInt(filtroUsuarioId);
    } else {
      // ADMIN can filter by any user freely
      where.usuarioId = BigInt(filtroUsuarioId);
    }
  }

  // Legacy date range (dataInicio field of atividade)
  if (dataInicio || dataFim) {
    where.dataInicio = {};
    if (dataInicio) (where.dataInicio as Record<string, Date>).gte = new Date(dataInicio);
    if (dataFim) (where.dataInicio as Record<string, Date>).lte = new Date(dataFim);
  }

  // Period filter: dataInicio >= periodoInicio AND dataFim <= periodoFim
  const periodoInicio = searchParams.get("periodoInicio");
  const periodoFim = searchParams.get("periodoFim");
  if (periodoInicio) {
    const cur = (where.dataInicio as Record<string, Date>) ?? {};
    cur.gte = new Date(periodoInicio);
    where.dataInicio = cur;
  }
  if (periodoFim) {
    where.dataFim = { lte: new Date(periodoFim) };
  }
  // concluida filter only applied after migration; column may not exist yet
  if (concluida !== null && concluida !== "") where.concluida = concluida === "true";

  let total = 0;
  let atividades: unknown[] = [];
  try {
    [total, atividades] = await Promise.all([
      prisma.atividade.count({ where }),
      prisma.atividade.findMany({
        where,
        include: {
          projeto: { select: { id: true, titulo: true } },
          usuario: { select: { id: true, nomeCompleto: true } },
          meta: { select: { id: true, descricao: true, ordem: true } },
          documentos: { select: { id: true, nomeOriginal: true, mimeType: true, tamanhoBytes: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ concluida: "asc" }, { dataInicio: "asc" }, { createdAt: "desc" }],
      }),
    ]);
  } catch {
    // Column concluida not yet migrated; retry without it
    delete where.concluida;
    [total, atividades] = await Promise.all([
      prisma.atividade.count({ where }),
      prisma.atividade.findMany({
        where,
        include: {
          projeto: { select: { id: true, titulo: true } },
          usuario: { select: { id: true, nomeCompleto: true } },
          meta: { select: { id: true, descricao: true, ordem: true } },
          documentos: { select: { id: true, nomeOriginal: true, mimeType: true, tamanhoBytes: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ dataInicio: "asc" }, { createdAt: "desc" }],
      }),
    ]);
  }

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

  const { projetoId, metaId, titulo, descricao, dataInicio, dataFim } = parsed.data;

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
      metaId: metaId ? BigInt(metaId) : null,
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
