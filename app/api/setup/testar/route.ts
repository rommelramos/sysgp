/**
 * POST /api/setup/testar — rota PÚBLICA (sem autenticação)
 * Usada exclusivamente pela página /setup para verificar a conexão
 * com o banco antes de criar o primeiro usuário administrador.
 */
import { NextRequest, NextResponse } from "next/server";
import { parseConnectionUrl } from "@/lib/db-url";
import * as mariadb from "mariadb";

export async function POST(req: NextRequest) {
  let body: { url: string; senha: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { url, senha } = body;
  if (!url) {
    return NextResponse.json({ error: "Informe a string de conexão" }, { status: 422 });
  }

  let parts: ReturnType<typeof parseConnectionUrl>;
  try {
    parts = parseConnectionUrl(url);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  let conn: mariadb.Connection | undefined;
  try {
    conn = await mariadb.createConnection({
      host:     parts.host,
      port:     parts.port,
      database: parts.database,
      user:     parts.user,
      password: senha,
      connectTimeout: 6000,
    });
    await conn.query("SELECT 1");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: msg });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
