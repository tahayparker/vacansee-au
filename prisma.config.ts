import path from "node:path";
import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // Migration-time connection (unpooled). The runtime connection
    // (pooled DATABASE_URL) is handed to the @prisma/adapter-pg driver
    // adapter in src/lib/prisma.ts.
    url: process.env.DIRECT_URL,
  },
});
