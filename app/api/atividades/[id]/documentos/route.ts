import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { bigintToString } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  let body: { documentos: Array<{ nomeOriginal: string; nomeArquivo: string; caminho: string; mimeType: string; tamanhoBytes: number; origem: "UPLOAD" | "PASTE" }> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const existentes = await prisma.atividadeDocumento.count({ where: { atividadeId: BigInt(id) } });
  if (existentes + body.documentos.length > 10) {
    return NextResponse.json({ error: "Limite de 10 documentos por atividade excedido" }, { status: 400 });
  }

  const docs = await prisma.atividadeDocumento.createMany({
    data: body.documentos.map((d) => ({
      atividadeId: BigInt(id),
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
