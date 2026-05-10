import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { conviteSchema } from "@/lib/validations/auth";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { bigintToString } from "@/lib/utils";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.perfil !== "ADMINISTRADOR")
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 25;

  const [total, convites] = await Promise.all([
    prisma.conviteCadastro.count(),
    prisma.conviteCadastro.findMany({
      include: {
        criadoPor: { select: { id: true, nomeCompleto: true } },
        usuarios: { select: { id: true, nomeCompleto: true, confirmado: true, createdAt: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json(bigintToString({ data: convites, total, page, pageSize }));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.perfil !== "ADMINISTRADOR")
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = conviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const token = randomBytes(32).toString("hex");

  const convite = await prisma.conviteCadastro.create({
    data: {
      token,
      descricao: parsed.data.descricao || null,
      criadoPorId: BigInt(session.id),
      usoMaximo: parsed.data.usoMaximo ?? 1,
      expiraEm: parsed.data.expiraEm ? new Date(parsed.data.expiraEm) : null,
    },
    include: { criadoPor: { select: { id: true, nomeCompleto: true } } },
  });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "CREATE",
    entidade: "convites_cadastro",
    entidadeId: convite.id,
    ipAddress: extrairIP(req),
  });

  return NextResponse.json(bigintToString(convite), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.perfil !== "ADMINISTRADOR")
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const { ativo } = body as { ativo?: boolean };
  const convite = await prisma.conviteCadastro.update({
    where: { id: BigInt(id) },
    data: { ...(ativo !== undefined && { ativo }) },
  });

  return NextResponse.json(bigintToString(convite));
}
