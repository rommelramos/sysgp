import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { metaSchema } from "@/lib/validations/projeto";
import { bigintToString } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const metas = await prisma.meta.findMany({
    where: { projetoMembroId: BigInt(id) },
    orderBy: { ordem: "asc" },
  });

  return NextResponse.json(bigintToString(metas));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!["ADMINISTRADOR", "SUPERVISOR"].includes(session.perfil))
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = metaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const lastMeta = await prisma.meta.findFirst({
    where: { projetoMembroId: BigInt(id) },
    orderBy: { ordem: "desc" },
  });

  const meta = await prisma.meta.create({
    data: {
      projetoMembroId: BigInt(id),
      descricao: parsed.data.descricao,
      ordem: (lastMeta?.ordem ?? 0) + 1,
    },
  });

  return NextResponse.json(bigintToString(meta), { status: 201 });
}
