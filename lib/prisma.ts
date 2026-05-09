import { PrismaClient } from "@/app/generated/prisma";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || "mysql://localhost/sysgp";
  const adapter = new PrismaMariaDb(databaseUrl);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
