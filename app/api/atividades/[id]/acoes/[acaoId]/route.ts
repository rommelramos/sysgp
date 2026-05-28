import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { bigintToString } from "@/lib/utils";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { z } from "zod";

const acaoUpdateSchema = z.object({
  descricao: z.string().min(1).optional(),
  dataOcorrido: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; acaoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id, acaoId } = await params;
  const acao = await prisma.acaoAtividade.findUnique({
    where: { id: BigInt(acaoId) },
    include: { atividade: { select: { usuarioId: true } } },
  });
  if (!acao) return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 });
  if (String(acao.atividadeId) !== id)
    return NextResponse.json({ error: "Ação não pertence a esta atividade" }, { status: 400 });
  if (session.perfil === "MEMBRO" && String(acao.atividade.usuarioId) !== session.id)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = acaoUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const updated = await prisma.acaoAtividade.update({
    where: { id: BigInt(acaoId) },
    data: {
      ...(parsed.data.descricao !== undefined && { descricao: parsed.data.descricao }),
      ...(parsed.data.dataOcorrido !== undefined && { dataOcorrido: new Date(parsed.data.dataOcorrido) }),
    },
    include: { documentos: true },
  });

  return NextResponse.json(bigintToString(updated));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; acaoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id, acaoId } = await params;
  const acao = await prisma.acaoAtividade.findUnique({
    where: { id: BigInt(acaoId) },
    include: { atividade: { select: { usuarioId: true } } },
  });
  if (!acao) return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 });
  if (String(acao.atividadeId) !== id)
    return NextResponse.json({ error: "Ação não pertence a esta atividade" }, { status: 400 });
  if (session.perfil === "MEMBRO" && String(acao.atividade.usuarioId) !== session.id)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  await prisma.acaoAtividade.delete({ where: { id: BigInt(acaoId) } });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "DELETE",
    entidade: "acoes_atividade",
    entidadeId: BigInt(acaoId),
    ipAddress: extrairIP(req),
  });

  return NextResponse.json({ ok: true });
}
