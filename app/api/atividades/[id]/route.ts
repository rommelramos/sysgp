import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { atividadeSchema } from "@/lib/validations/projeto";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { bigintToString } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const atividade = await prisma.atividade.findUnique({
    where: { id: BigInt(id) },
    include: {
      projeto: { select: { id: true, titulo: true } },
      usuario: { select: { id: true, nomeCompleto: true } },
      meta: { select: { id: true, descricao: true, ordem: true } },
      documentos: { select: { id: true, nomeOriginal: true, mimeType: true, tamanhoBytes: true } },
    },
  });

  if (!atividade) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  if (session.perfil === "MEMBRO" && String(atividade.usuarioId) !== session.id) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  return NextResponse.json(bigintToString(atividade));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const atividade = await prisma.atividade.findUnique({ where: { id: BigInt(id) } });
  if (!atividade) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  if (session.perfil === "MEMBRO" && String(atividade.usuarioId) !== session.id) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = atividadeSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { titulo, descricao, metaId, dataInicio, dataFim } = parsed.data;

  const updated = await prisma.atividade.update({
    where: { id: BigInt(id) },
    data: {
      ...(titulo && { titulo }),
      ...(descricao !== undefined && { descricao: descricao || null }),
      ...(metaId !== undefined && { metaId: metaId ? BigInt(metaId) : null }),
      ...(dataInicio !== undefined && { dataInicio: dataInicio ? new Date(dataInicio) : null }),
      ...(dataFim !== undefined && { dataFim: dataFim ? new Date(dataFim) : null }),
    },
    include: {
      projeto: { select: { id: true, titulo: true } },
      usuario: { select: { id: true, nomeCompleto: true } },
      meta: { select: { id: true, descricao: true, ordem: true } },
    },
  });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "UPDATE",
    entidade: "atividades",
    entidadeId: BigInt(id),
    ipAddress: extrairIP(req),
  });

  return NextResponse.json(bigintToString(updated));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const atividade = await prisma.atividade.findUnique({ where: { id: BigInt(id) } });
  if (!atividade) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  if (session.perfil === "MEMBRO" && String(atividade.usuarioId) !== session.id) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  if (session.perfil === "SUPERVISOR") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  await prisma.atividade.delete({ where: { id: BigInt(id) } });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "DELETE",
    entidade: "atividades",
    entidadeId: BigInt(id),
    ipAddress: extrairIP(req),
  });

  return NextResponse.json({ ok: true });
}
