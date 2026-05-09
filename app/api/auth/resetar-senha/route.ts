import { NextRequest, NextResponse } from "next/server";
import { resetarSenhaSchema } from "@/lib/validations/auth";
import { validarTokenRecuperacao, marcarTokenUsado, hashSenha } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria, extrairIP } from "@/lib/audit";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = resetarSenhaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { token, senha } = parsed.data;
  const registro = await validarTokenRecuperacao(token);

  if (!registro) {
    return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 400 });
  }

  const hash = await hashSenha(senha);
  await prisma.usuario.update({
    where: { id: registro.usuarioId },
    data: { senhaHash: hash },
  });

  await marcarTokenUsado(registro.id);

  await registrarAuditoria({
    usuarioId: registro.usuarioId,
    acao: "PASSWORD_RESET",
    ipAddress: extrairIP(req),
  });

  return NextResponse.json({ message: "Senha redefinida com sucesso" });
}
