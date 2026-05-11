import { PrismaClient } from "@/app/generated/prisma";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { parseConnectionUrl, envConnectionUrl } from "@/lib/db-url";

function createPrismaClient() {
  const url = envConnectionUrl();
  const { host, port, user, database } = parseConnectionUrl(url);
  const pwdMatch = url.match(/^mysql:\/\/[^:@]+:([^@]+)@/);
  const password = pwdMatch ? decodeURIComponent(pwdMatch[1]) : (process.env.DB_PASSWORD ?? "");

  const adapter = new PrismaMariaDb({
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 3,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
// Always reuse the global — critical in serverless (Vercel) to avoid connection exhaustion
globalForPrisma.prisma = prisma;
