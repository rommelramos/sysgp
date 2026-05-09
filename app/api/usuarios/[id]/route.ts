import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { editarUsuarioSchema } from "@/lib/validations/auth";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { bigintToString } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.perfil !== "ADMINISTRADOR")
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const usuario = await prisma.usuario.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true, nomeCompleto: true, cpf: true, rg: true, dataNasc: true,
      email: true, perfil: true, ativo: true, supervisorId: true, createdAt: true,
      supervisor: { select: { id: true, nomeCompleto: true } },
    },
  });

  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json(bigintToString(usuario));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.perfil !== "ADMINISTRADOR")
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = editarUsuarioSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { nomeCompleto, rg, dataNasc, perfil, supervisorId, ativo } = parsed.data;

  const usuario = await prisma.usuario.update({
    where: { id: BigInt(id) },
    data: {
      nomeCompleto,
      rg: rg || null,
      dataNasc: dataNasc ? new Date(dataNasc) : null,
      perfil: perfil as "MEMBRO" | "SUPERVISOR" | "ADMINISTRADOR",
      supervisorId: supervisorId ? BigInt(supervisorId) : null,
      ...(ativo !== undefined && { ativo }),
    },
    select: { id: true, nomeCompleto: true, email: true, perfil: true, ativo: true },
  });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "UPDATE",
    entidade: "usuarios",
    entidadeId: BigInt(id),
    ipAddress: extrairIP(req),
  });

  return NextResponse.json(bigintToString(usuario));
}
