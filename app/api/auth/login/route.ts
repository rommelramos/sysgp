import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { verificarSenha } from "@/lib/auth";
import { criarAccessToken } from "@/lib/session";
import { criarRefreshToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, authLimiter, loginFailLimiter } from "@/lib/rate-limiter";
import { registrarAuditoria, extrairIP } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = extrairIP(req);

  const authCheck = await checkRateLimit(authLimiter, ip);
  if (!authCheck.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
      { status: 429, headers: { "Retry-After": String(authCheck.retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { email, senha } = parsed.data;
  const failKey = `${ip}:${email}`;

  const failCheck = await checkRateLimit(loginFailLimiter, failKey);
  if (!failCheck.allowed) {
    return NextResponse.json(
      { error: `Conta bloqueada. Tente novamente em ${failCheck.retryAfter} segundos.` },
      { status: 429 }
    );
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, email: true, nomeCompleto: true, perfil: true, senhaHash: true, ativo: true },
  });

  if (!usuario || !usuario.ativo) {
    await registrarAuditoria({ acao: "LOGIN_FALHA", ipAddress: ip, detalhes: { email } });
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const senhaValida = await verificarSenha(senha, usuario.senhaHash);
  if (!senhaValida) {
    await registrarAuditoria({
      acao: "LOGIN_FALHA",
      usuarioId: usuario.id,
      ipAddress: ip,
      detalhes: { email },
    });
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const sessionUser = {
    id: String(usuario.id),
    email: usuario.email,
    nome: usuario.nomeCompleto,
    perfil: usuario.perfil,
  };

  const [accessToken, refreshToken] = await Promise.all([
    criarAccessToken(sessionUser),
    criarRefreshToken(usuario.id),
  ]);

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "LOGIN",
    ipAddress: ip,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const res = NextResponse.json({ user: sessionUser }, { status: 200 });
  res.headers.append(
    "Set-Cookie",
    `access_token=${accessToken}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=3600`
  );
  res.headers.append(
    "Set-Cookie",
    `refresh_token=${refreshToken}; HttpOnly${secure}; SameSite=Strict; Path=/api/auth; Max-Age=604800`
  );

  return res;
}
