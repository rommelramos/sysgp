import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/** Verifica se o setup já foi feito (existe pelo menos 1 usuário) */
export async function GET() {
  try {
    const count = await prisma.usuario.count();
    return NextResponse.json({ configured: count > 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao acessar banco";
    return NextResponse.json({ configured: false, error: msg }, { status: 500 });
  }
}

/** Cria o primeiro usuário ADMINISTRADOR — bloqueado após o primeiro uso */
export async function POST(req: NextRequest) {
  try {
    const count = await prisma.usuario.count();
    if (count > 0) {
      return NextResponse.json(
        { error: "Setup já realizado. O sistema já possui usuários cadastrados." },
        { status: 403 }
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao acessar banco";
    return NextResponse.json({ error: `Banco inacessível: ${msg}` }, { status: 500 });
  }

  let body: { nomeCompleto: string; cpf: string; email: string; senha: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { nomeCompleto, cpf, email, senha } = body;

  if (!nomeCompleto || !cpf || !email || !senha) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 422 });
  }
  if (senha.length < 8) {
    return NextResponse.json({ error: "Senha deve ter ao menos 8 caracteres" }, { status: 422 });
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nomeCompleto,
        cpf: cpf.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"),
        email,
        senhaHash,
        perfil: "ADMINISTRADOR",
        ativo: true,
      },
      select: { id: true, nomeCompleto: true, email: true, perfil: true },
    });

    return NextResponse.json({
      ok: true,
      usuario: { ...usuario, id: String(usuario.id) },
    }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: `Erro ao criar usuário: ${msg}` }, { status: 500 });
  }
}
