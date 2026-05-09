import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validarRefreshToken, criarRefreshToken, revogarRefreshToken } from "@/lib/auth";
import { criarAccessToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("refresh_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const registro = await validarRefreshToken(token);
  if (!registro || !registro.usuario.ativo) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const res = NextResponse.json({ error: "Sessão expirada" }, { status: 401 });
    res.headers.append("Set-Cookie", `access_token=; HttpOnly${secure}; Path=/; Max-Age=0`);
    res.headers.append("Set-Cookie", `refresh_token=; HttpOnly${secure}; Path=/api/auth; Max-Age=0`);
    return res;
  }

  // Rotate refresh token
  await revogarRefreshToken(token);
  const novoRefreshToken = await criarRefreshToken(registro.usuario.id);
  const sessionUser = {
    id: String(registro.usuario.id),
    email: registro.usuario.email,
    nome: registro.usuario.nomeCompleto,
    perfil: registro.usuario.perfil,
  };
  const novoAccessToken = await criarAccessToken(sessionUser);

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const res = NextResponse.json({ user: sessionUser });
  res.headers.append(
    "Set-Cookie",
    `access_token=${novoAccessToken}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=3600`
  );
  res.headers.append(
    "Set-Cookie",
    `refresh_token=${novoRefreshToken}; HttpOnly${secure}; SameSite=Strict; Path=/api/auth; Max-Age=604800`
  );

  return res;
}
