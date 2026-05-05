import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

const datasourceUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/vereindigital";

process.env.DATABASE_URL ??= datasourceUrl;
process.env.DIRECT_URL ??= datasourceUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
