import { PrismaClient } from "@/app/generated/prisma";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { envConnectionUrl } from "@/lib/db-url";

function createPrismaClient() {
  const url = envConnectionUrl();
  const adapter = new PrismaMariaDb(url);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
