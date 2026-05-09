import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revogarRefreshToken } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { registrarAuditoria, extrairIP } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  const session = await getSession();

  if (refreshToken) {
    await revogarRefreshToken(refreshToken);
  }

  if (session) {
    await registrarAuditoria({
      usuarioId: BigInt(session.id),
      acao: "LOGOUT",
      ipAddress: extrairIP(req),
    });
  }

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const res = NextResponse.json({ message: "Logout realizado" });
  res.headers.append("Set-Cookie", `access_token=; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=0`);
  res.headers.append(
    "Set-Cookie",
    `refresh_token=; HttpOnly${secure}; SameSite=Strict; Path=/api/auth; Max-Age=0`
  );

  return res;
}
