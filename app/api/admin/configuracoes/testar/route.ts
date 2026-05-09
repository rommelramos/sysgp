import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import * as mariadb from "mariadb";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.perfil !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { host: string; porta: string; nome: string; usuario: string; senha: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { host, porta, nome, usuario, senha } = body;
  if (!host || !nome || !usuario) {
    return NextResponse.json({ error: "Preencha host, nome do banco e usuário" }, { status: 422 });
  }

  let conn: mariadb.Connection | undefined;
  try {
    conn = await mariadb.createConnection({
      host,
      port: Number(porta) || 3306,
      database: nome,
      user: usuario,
      password: senha,
      connectTimeout: 5000,
    });
    await conn.query("SELECT 1");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
