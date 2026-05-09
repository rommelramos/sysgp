import "dotenv/config";
import { defineConfig } from "prisma/config";
import { buildConnectionUrl } from "./lib/db-url";

const base = process.env["DATABASE_URL"] ?? "mysql://root@localhost:3306/sysgp";
const pwd  = process.env["DB_PASSWORD"]  ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: buildConnectionUrl(base, pwd),
  },
});
