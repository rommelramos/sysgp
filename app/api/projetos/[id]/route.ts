import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { projetoSchema } from "@/lib/validations/projeto";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { bigintToString } from "@/lib/utils";

async function podeEditar(session: { id: string; perfil: string }, projetoId: bigint) {
  if (session.perfil === "ADMINISTRADOR") return true;
  const membro = await prisma.projetoMembro.findFirst({
    where: { projetoId, usuarioId: BigInt(session.id), isCoordenador: true },
  });
  return !!membro;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const projeto = await prisma.projeto.findUnique({
    where: { id: BigInt(id) },
    include: {
      coordenador: { select: { id: true, nomeCompleto: true, email: true } },
      membros: {
        include: { usuario: { select: { id: true, nomeCompleto: true, email: true, perfil: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { atividades: true } },
    },
  });

  if (!projeto) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  if (session.perfil === "MEMBRO") {
    const vinculado = projeto.membros.some((m: { usuarioId: bigint }) => String(m.usuarioId) === session.id);
    if (!vinculado) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  return NextResponse.json(bigintToString(projeto));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const pode = await podeEditar(session, BigInt(id));
  if (!pode) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = projetoSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { titulo, descricao, areaTematica, instituicaoExecucao, instituicaoFinanciadora, areaConhecimento, dataInicio, dataFimPrevista, status, coordenadorId } = parsed.data;

  const projeto = await prisma.projeto.update({
    where: { id: BigInt(id) },
    data: {
      ...(titulo && { titulo }),
      ...(descricao !== undefined && { descricao }),
      ...(areaTematica !== undefined && { areaTematica }),
      ...(instituicaoExecucao !== undefined && { instituicaoExecucao: instituicaoExecucao || null }),
      ...(instituicaoFinanciadora !== undefined && { instituicaoFinanciadora: instituicaoFinanciadora || null }),
      ...(areaConhecimento !== undefined && { areaConhecimento: areaConhecimento || null }),
      ...(dataInicio !== undefined && { dataInicio: dataInicio ? new Date(dataInicio) : null }),
      ...(dataFimPrevista !== undefined && { dataFimPrevista: dataFimPrevista ? new Date(dataFimPrevista) : null }),
      ...(status && { status: status as "EM_ANDAMENTO" | "CONCLUIDO" | "SUSPENSO" }),
      ...(coordenadorId && { coordenadorId: BigInt(coordenadorId) }),
    },
    include: { coordenador: { select: { id: true, nomeCompleto: true } } },
  });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "UPDATE",
    entidade: "projetos",
    entidadeId: BigInt(id),
    ipAddress: extrairIP(req),
  });

  return NextResponse.json(bigintToString(projeto));
}
