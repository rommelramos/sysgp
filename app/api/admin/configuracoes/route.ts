import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { stripPassword } from "@/lib/db-url";

/** Retorna a URL base atual (sem senha) e se a senha está configurada */
export async function GET() {
  const session = await getSession();
  if (!session || session.perfil !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const envUrl = process.env.DATABASE_URL ?? "";
  const hasPassword = Boolean(process.env.DB_PASSWORD);

  return NextResponse.json({
    url: stripPassword(envUrl),
    hasPassword,
  });
}

/** Persiste a URL (sem senha) na tabela de configuração */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.perfil !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { url: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { url } = body;
  if (!url) {
    return NextResponse.json({ error: "URL é obrigatória" }, { status: 422 });
  }

  // Persiste apenas a URL (sem senha) — senha fica exclusivamente em variável de ambiente
  await prisma.configuracaoSistema.upsert({
    where: { id: 1 },
    create: { id: 1, dbHost: url },
    update: { dbHost: url },
  });

  return NextResponse.json({ ok: true });
}
