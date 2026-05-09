import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.perfil !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const config = await prisma.configuracaoSistema.findFirst({ where: { id: 1 } });
  if (!config) return NextResponse.json({});

  return NextResponse.json({
    host: config.dbHost ?? "",
    porta: String(config.dbPorta),
    nome: config.dbNome ?? "",
    usuario: config.dbUsuario ?? "",
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.perfil !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { host: string; porta: string; nome: string; usuario: string; senha: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { host, porta, nome, usuario } = body;

  await prisma.configuracaoSistema.upsert({
    where: { id: 1 },
    create: { id: 1, dbHost: host, dbPorta: Number(porta) || 3306, dbNome: nome, dbUsuario: usuario },
    update: { dbHost: host, dbPorta: Number(porta) || 3306, dbNome: nome, dbUsuario: usuario },
  });

  return NextResponse.json({ ok: true });
}
