import { NextRequest, NextResponse } from "next/server";
import { recuperarSenhaSchema } from "@/lib/validations/auth";
import { criarTokenRecuperacao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, authLimiter } from "@/lib/rate-limiter";
import { registrarAuditoria, extrairIP } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = extrairIP(req);
  const check = await checkRateLimit(authLimiter, `reset:${ip}`);
  if (!check.allowed) {
    return NextResponse.json({ error: "Muitas tentativas" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = recuperarSenhaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: parsed.data.email, ativo: true },
    select: { id: true, email: true, nomeCompleto: true },
  });

  // Always return success to avoid email enumeration
  if (usuario) {
    const token = await criarTokenRecuperacao(usuario.id);
    // TODO: Send email with token link
    // await sendResetEmail(usuario.email, token);
    console.log(`[DEV] Reset token para ${usuario.email}: ${token}`);

    await registrarAuditoria({
      usuarioId: usuario.id,
      acao: "PASSWORD_RESET_REQUEST",
      ipAddress: ip,
    });
  }

  return NextResponse.json({
    message: "Se o e-mail existir, você receberá um link de recuperação em breve.",
  });
}
