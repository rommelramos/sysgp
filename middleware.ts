import { NextRequest, NextResponse } from "next/server";
import { verificarAccessToken } from "@/lib/session";

const publicRoutes = ["/login", "/recuperar-senha", "/resetar-senha"];
const apiPublicRoutes = [
  "/api/auth/login",
  "/api/auth/recuperar-senha",
  "/api/auth/resetar-senha",
  "/api/auth/refresh",
];

const adminOnlyRoutes = ["/usuarios", "/admin"];
const adminApiRoutes = ["/api/usuarios", "/api/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (apiPublicRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Allow public pages
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Verify session
  const token = req.cookies.get("access_token")?.value;
  let session = token ? await verificarAccessToken(token) : null;

  // Try refresh if access token missing/expired
  if (!session) {
    const refreshToken = req.cookies.get("refresh_token")?.value;
    if (refreshToken) {
      const refreshResponse = await fetch(new URL("/api/auth/refresh", req.url), {
        method: "POST",
        headers: { Cookie: `refresh_token=${refreshToken}` },
      });

      if (refreshResponse.ok) {
        const response = NextResponse.next();
        refreshResponse.headers.forEach((value, key) => {
          if (key.toLowerCase() === "set-cookie") {
            response.headers.append("Set-Cookie", value);
          }
        });
        return response;
      }
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only route protection
  const isAdminRoute =
    adminOnlyRoutes.some((r) => pathname.startsWith(r)) ||
    adminApiRoutes.some((r) => pathname.startsWith(r));

  if (isAdminRoute && session.perfil !== "ADMINISTRADOR") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
