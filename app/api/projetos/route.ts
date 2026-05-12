import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { projetoSchema } from "@/lib/validations/projeto";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { bigintToString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");
  const busca = searchParams.get("busca") || "";
  const status = searchParams.get("status") || undefined;
  // When true: return only projects where the session user is the coordenador
  const somenteMinhasCoord = searchParams.get("somenteMinhasCoord") === "1";

  const where: Record<string, unknown> = {};

  if (somenteMinhasCoord) {
    // Filter to projects the user coordinates (ignores role-based filter)
    where.OR = [
      { coordenadorId: BigInt(session.id) },
      { membros: { some: { usuarioId: BigInt(session.id), isCoordenador: true } } },
    ];
  } else if (session.perfil === "MEMBRO") {
    where.membros = { some: { usuarioId: BigInt(session.id), statusVinculo: "ATIVO" } };
  } else if (session.perfil === "SUPERVISOR") {
    where.OR = [
      { coordenadorId: BigInt(session.id) },
      { membros: { some: { usuarioId: BigInt(session.id) } } },
    ];
  }

  if (busca) (where as Record<string, unknown>).titulo = { contains: busca };
  if (status) (where as Record<string, unknown>).status = status;

  const [total, projetos] = await Promise.all([
    prisma.projeto.count({ where }),
    prisma.projeto.findMany({
      where,
      include: {
        coordenador: { select: { id: true, nomeCompleto: true, email: true } },
        _count: { select: { membros: true, atividades: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Fetch completed activities count per project in a single query
  // Gracefully handled: column may not exist until migration runs (P2022)
  const projetoIds = projetos.map((p) => p.id);
  let concluidasMap = new Map<string, number>();
  if (projetoIds.length > 0) {
    try {
      const groups = await prisma.atividade.groupBy({
        by: ["projetoId"],
        where: { projetoId: { in: projetoIds }, concluida: true },
        _count: { id: true },
      });
      concluidasMap = new Map(groups.map((g) => [String(g.projetoId), g._count.id]));
    } catch {
      // Column concluida not yet migrated; return 0 for all projects
    }
  }

  const data = projetos.map((p) => ({
    ...p,
    _countConcluidas: concluidasMap.get(String(p.id)) ?? 0,
  }));

  return NextResponse.json(
    bigintToString({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.perfil !== "ADMINISTRADOR")
    return NextResponse.json({ error: "Apenas ADMINISTRADOR pode criar projetos" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = projetoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { titulo, descricao, areaTematica, instituicaoExecucao, instituicaoFinanciadora, areaConhecimento, dataInicio, dataFimPrevista, status, coordenadorId } = parsed.data;

  const projeto = await prisma.projeto.create({
    data: {
      titulo,
      descricao: descricao || null,
      areaTematica: areaTematica || null,
      instituicaoExecucao: instituicaoExecucao || null,
      instituicaoFinanciadora: instituicaoFinanciadora || null,
      areaConhecimento: areaConhecimento || null,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataFimPrevista: dataFimPrevista ? new Date(dataFimPrevista) : null,
      status: status as "EM_ANDAMENTO" | "CONCLUIDO" | "SUSPENSO",
      coordenadorId: BigInt(coordenadorId),
    },
    include: { coordenador: { select: { id: true, nomeCompleto: true } } },
  });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "CREATE",
    entidade: "projetos",
    entidadeId: projeto.id,
    ipAddress: extrairIP(req),
  });

  return NextResponse.json(bigintToString(projeto), { status: 201 });
}
