import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoCadastroSchema } from "@/lib/validations/auth";
import { hashSenha } from "@/lib/auth";
import { bigintToString } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const convite = await prisma.conviteCadastro.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      descricao: true,
      usoMaximo: true,
      usoAtual: true,
      expiraEm: true,
      ativo: true,
    },
  });

  if (!convite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (!convite.ativo) return NextResponse.json({ error: "Este convite foi desativado" }, { status: 410 });
  if (convite.usoAtual >= convite.usoMaximo) return NextResponse.json({ error: "Este convite já atingiu o limite de usos" }, { status: 410 });
  if (convite.expiraEm && new Date(convite.expiraEm) < new Date()) return NextResponse.json({ error: "Este convite expirou" }, { status: 410 });

  return NextResponse.json(bigintToString(convite));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const convite = await prisma.conviteCadastro.findUnique({ where: { token } });
  if (!convite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (!convite.ativo) return NextResponse.json({ error: "Este convite foi desativado" }, { status: 410 });
  if (convite.usoAtual >= convite.usoMaximo) return NextResponse.json({ error: "Limite de cadastros atingido" }, { status: 410 });
  if (convite.expiraEm && new Date(convite.expiraEm) < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 410 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requisição inválida" }, { status: 400 }); }

  const parsed = autoCadastroSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { nomeCompleto, cpf, rg, dataNasc, email, senha } = parsed.data;

  const existe = await prisma.usuario.findFirst({ where: { OR: [{ email }, { cpf }] } });
  if (existe) {
    const campo = existe.email === email ? "e-mail" : "CPF";
    return NextResponse.json({ error: `Já existe um usuário com este ${campo}` }, { status: 409 });
  }

  const senhaHash = await hashSenha(senha);

  const [usuario] = await prisma.$transaction([
    prisma.usuario.create({
      data: {
        nomeCompleto,
        cpf,
        rg: rg || null,
        dataNasc: dataNasc ? new Date(dataNasc) : null,
        email,
        senhaHash,
        perfil: "MEMBRO",
        confirmado: false,
        conviteId: convite.id,
      },
      select: { id: true, nomeCompleto: true, email: true },
    }),
    prisma.conviteCadastro.update({
      where: { id: convite.id },
      data: { usoAtual: { increment: 1 } },
    }),
  ]);

  return NextResponse.json(bigintToString(usuario), { status: 201 });
}
