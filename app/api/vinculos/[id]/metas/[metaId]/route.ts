import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { metaSchema } from "@/lib/validations/projeto";
import { bigintToString } from "@/lib/utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ metaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!["ADMINISTRADOR", "SUPERVISOR"].includes(session.perfil))
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { metaId } = await params;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = metaSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const meta = await prisma.meta.update({
    where: { id: BigInt(metaId) },
    data: {
      ...(parsed.data.descricao && { descricao: parsed.data.descricao }),
      ...(parsed.data.ordem !== undefined && { ordem: parsed.data.ordem }),
    },
  });

  return NextResponse.json(bigintToString(meta));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ metaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!["ADMINISTRADOR", "SUPERVISOR"].includes(session.perfil))
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { metaId } = await params;
  await prisma.meta.delete({ where: { id: BigInt(metaId) } });

  return NextResponse.json({ ok: true });
}
