import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hashSenha } from "@/lib/auth";
import { cadastroUsuarioSchema } from "@/lib/validations/auth";
import { registrarAuditoria, extrairIP } from "@/lib/audit";
import { bigintToString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.perfil !== "ADMINISTRADOR")
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");
  const busca = searchParams.get("busca") || "";
  const perfil = searchParams.get("perfil") || undefined;

  const where = {
    ...(busca
      ? {
          OR: [
            { nomeCompleto: { contains: busca } },
            { email: { contains: busca } },
            { cpf: { contains: busca } },
          ],
        }
      : {}),
    ...(perfil ? { perfil: perfil as "MEMBRO" | "SUPERVISOR" | "ADMINISTRADOR" } : {}),
  };

  const [total, usuarios] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nomeCompleto: true,
        cpf: true,
        email: true,
        perfil: true,
        ativo: true,
        createdAt: true,
        supervisor: { select: { id: true, nomeCompleto: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { nomeCompleto: "asc" },
    }),
  ]);

  return NextResponse.json(
    bigintToString({ data: usuarios, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.perfil !== "ADMINISTRADOR")
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = cadastroUsuarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { nomeCompleto, cpf, rg, dataNasc, email, senha, perfil, supervisorId } = parsed.data;

  const existe = await prisma.usuario.findFirst({ where: { OR: [{ email }, { cpf }] } });
  if (existe) {
    const campo = existe.email === email ? "e-mail" : "CPF";
    return NextResponse.json({ error: `Já existe um usuário com este ${campo}` }, { status: 409 });
  }

  const senhaHash = await hashSenha(senha);
  const usuario = await prisma.usuario.create({
    data: {
      nomeCompleto,
      cpf,
      rg: rg || null,
      dataNasc: dataNasc ? new Date(dataNasc) : null,
      email,
      senhaHash,
      perfil: perfil as "MEMBRO" | "SUPERVISOR" | "ADMINISTRADOR",
      supervisorId: supervisorId ? BigInt(supervisorId) : null,
    },
    select: { id: true, nomeCompleto: true, email: true, perfil: true },
  });

  await registrarAuditoria({
    usuarioId: BigInt(session.id),
    acao: "CREATE",
    entidade: "usuarios",
    entidadeId: usuario.id,
    ipAddress: extrairIP(req),
  });

  return NextResponse.json(bigintToString(usuario), { status: 201 });
}
