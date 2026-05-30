import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { bigintToString } from "@/lib/utils";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { z } from "zod";

const acaoSchema = z.object({
  descricao: z.string().min(1, "Descrição obrigatória"),
  dataOcorrido: z.string().min(1, "Data obrigatória"),
  documentos: z.array(z.object({
    nomeOriginal: z.string(),
    nomeArquivo: z.string(),
    caminho: z.string(),
    mimeType: z.string(),
    tamanhoBytes: z.number(),
    origem: z.enum(["UPLOAD", "PASTE"]).default("UPLOAD"),
    conteudoBase64: z.string().optional(), // base64 content from upload API
  })).optional().default([]),
});

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const atividade = await prisma.atividade.findUnique({
    where: { id: BigInt(id) },
    select: { usuarioId: true },
  });
  if (!atividade) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  if (session.perfil === "MEMBRO" && String(atividade.usuarioId) !== session.id)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const acoes = await prisma.acaoAtividade.findMany({
    where: { atividadeId: BigInt(id) },
    include: {
      documentos: {
        select: {
          id: true, nomeOriginal: true, nomeArquivo: true,
          caminho: true, mimeType: true, tamanhoBytes: true, origem: true, createdAt: true,
          // Exclude conteudo from list responses (large binary)
        },
      },
    },
    orderBy: { dataOcorrido: "asc" },
  });

  return NextResponse.json(bigintToString(acoes));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const atividadeId = BigInt(id);

  const atividade = await prisma.atividade.findUnique({
    where: { id: atividadeId },
    select: { usuarioId: true },
  });
  if (!atividade) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

  if (session.perfil === "MEMBRO" && String(atividade.usuarioId) !== session.id)
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = acaoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { descricao, dataOcorrido, documentos } = parsed.data;

  // Create the action first
  const acao = await prisma.acaoAtividade.create({
    data: { atividadeId, descricao, dataOcorrido: new Date(dataOcorrido) },
  });

  // Create each document individually so we can store binary content.
  // Priority: base64 sent by client (works on Vercel) → file on disk (self-hosted fallback).
  if (documentos.length > 0) {
    await Promise.all(
      documentos.map((d) => {
        const conteudo = d.conteudoBase64
          ? Buffer.from(d.conteudoBase64, "base64")
          : lerConteudo(d.caminho);
        return prisma.acaoDocumento.create({
          data: {
            acaoId: acao.id,
            nomeOriginal: d.nomeOriginal,
            nomeArquivo: d.nomeArquivo,
            caminho: d.caminho,
            mimeType: d.mimeType,
            tamanhoBytes: d.tamanhoBytes,
            origem: d.origem,
            ...(conteudo ? { conteudo } : {}),
          },
        });
      })
    );
  }

  const acaoComDocs = await prisma.acaoAtividade.findUnique({
    where: { id: acao.id },
    include: {
      documentos: {
        select: {
          id: true, nomeOriginal: true, nomeArquivo: true,
          caminho: true, mimeType: true, tamanhoBytes: true, origem: true, createdAt: true,
        },
      },
    },
  });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "CREATE",
    entidade: "acoes_atividade",
    entidadeId: acao.id,
    ipAddress: extrairIP(req),
  });

  return NextResponse.json(bigintToString(acaoComDocs), { status: 201 });
}
