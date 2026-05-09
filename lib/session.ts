import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionUser } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production-32ch"
);

export async function criarAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    nome: user.nome,
    perfil: user.perfil,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(JWT_SECRET);
}

export async function verificarAccessToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.sub as string,
      email: payload.email as string,
      nome: payload.nome as string,
      perfil: payload.perfil as SessionUser["perfil"],
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  return verificarAccessToken(token);
}

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string
): Response {
  const headers = new Headers(response.headers);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  headers.append(
    "Set-Cookie",
    `access_token=${accessToken}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=3600`
  );
  headers.append(
    "Set-Cookie",
    `refresh_token=${refreshToken}; HttpOnly${secure}; SameSite=Strict; Path=/api/auth; Max-Age=604800`
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function clearAuthCookies(): Headers {
  const headers = new Headers();
  headers.append("Set-Cookie", "access_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
  headers.append(
    "Set-Cookie",
    "refresh_token=; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=0"
  );
  return headers;
}
