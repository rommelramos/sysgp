/**
 * Helpers para montar e parsear a URL de conexão MySQL/MariaDB.
 *
 * Formato esperado de DATABASE_URL (sem senha):
 *   mysql://usuario@host:3306/sysgp
 *
 * A senha fica separada em DB_PASSWORD.
 */

/** Injeta a senha na URL base, substituindo qualquer senha existente */
export function buildConnectionUrl(baseUrl: string, password: string): string {
  if (!baseUrl) return "";
  // Remove qualquer senha já embutida, depois injeta a nova (ou deixa vazio)
  const withoutPassword = baseUrl.replace(
    /^(mysql:\/\/[^:@]+)(?::[^@]*)?(@)/,
    "$1$2"
  );
  if (!password) return withoutPassword;
  return withoutPassword.replace(
    /^(mysql:\/\/[^@]+)(@)/,
    `$1:${encodeURIComponent(password)}$2`
  );
}

/** Monta a URL completa a partir das variáveis de ambiente */
export function envConnectionUrl(): string {
  const base = process.env.DATABASE_URL ?? "mysql://root@localhost:3306/sysgp";
  const pwd  = process.env.DB_PASSWORD  ?? "";
  return buildConnectionUrl(base, pwd);
}

/** Retorna a URL sem a senha (para exibir na UI) */
export function stripPassword(url: string): string {
  return url.replace(/^(mysql:\/\/[^:@]+)(?::[^@]*)?(@)/, "$1$2");
}

export interface ConnectionParts {
  user:     string;
  host:     string;
  port:     number;
  database: string;
}

/** Extrai as partes da URL (sem senha) */
export function parseConnectionUrl(url: string): ConnectionParts {
  const clean = stripPassword(url);
  const m = clean.match(
    /^mysql:\/\/([^@]+)@([^:/]+)(?::(\d+))?\/([^?#]+)/
  );
  if (!m) throw new Error(`URL de conexão inválida: "${url}"`);
  const [, user, host, port, database] = m;
  return { user, host, port: port ? Number(port) : 3306, database };
}
