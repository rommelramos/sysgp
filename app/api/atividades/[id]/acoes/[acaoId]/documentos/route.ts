import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { bigintToString } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; acaoId: string }> }) {
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

  let body: { documentos: Array<{ nomeOriginal: string; nomeArquivo: string; caminho: string; mimeType: string; tamanhoBytes: number; origem: "UPLOAD" | "PASTE" }> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const docs = await prisma.acaoDocumento.createMany({
    data: body.documentos.map((d) => ({
      acaoId: BigInt(acaoId),
      nomeOriginal: d.nomeOriginal,
      nomeArquivo: d.nomeArquivo,
      caminho: d.caminho,
      mimeType: d.mimeType,
      tamanhoBytes: d.tamanhoBytes,
      origem: d.origem,
    })),
  });

  return NextResponse.json(bigintToString({ count: docs.count }), { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; acaoId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "docId obrigatório" }, { status: 400 });

  const { acaoId } = await params;
  const doc = await prisma.acaoDocumento.findUnique({
    where: { id: BigInt(docId) },
    select: { acaoId: true },
  });
  if (!doc || String(doc.acaoId) !== acaoId)
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  await prisma.acaoDocumento.delete({ where: { id: BigInt(docId) } });
  return NextResponse.json({ ok: true });
}
