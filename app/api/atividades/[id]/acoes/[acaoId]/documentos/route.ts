import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { bigintToString } from "@/lib/utils";

/** Read file bytes from the uploads directory (best-effort). */
function lerConteudo(caminho: string): Buffer | null {
  try {
    const filePath = join(process.cwd(), caminho.startsWith("/") ? caminho.slice(1) : caminho);
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath);
  } catch {
    return null;
  }
}

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

  let body: { documentos: Array<{ nomeOriginal: string; nomeArquivo: string; caminho: string; mimeType: string; tamanhoBytes: number; origem: "UPLOAD" | "PASTE"; conteudoBase64?: string }> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  // Priority: base64 sent by client (works on Vercel) → file on disk (self-hosted fallback).
  const created = await Promise.all(
    body.documentos.map((d) => {
      const conteudo = d.conteudoBase64
        ? Buffer.from(d.conteudoBase64, "base64")
        : lerConteudo(d.caminho);
      return prisma.acaoDocumento.create({
        data: {
          acaoId: BigInt(acaoId),
          nomeOriginal: d.nomeOriginal,
          nomeArquivo: d.nomeArquivo,
          caminho: d.caminho,
          mimeType: d.mimeType,
          tamanhoBytes: d.tamanhoBytes,
          origem: d.origem,
          ...(conteudo ? { conteudo: conteudo as unknown as Uint8Array<ArrayBuffer> } : {}),
        },
        select: {
          id: true, nomeOriginal: true, nomeArquivo: true,
          caminho: true, mimeType: true, tamanhoBytes: true, origem: true, createdAt: true,
        },
      });
    })
  );

  return NextResponse.json(bigintToString({ count: created.length, documentos: created }), { status: 201 });
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
