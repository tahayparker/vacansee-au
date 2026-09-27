import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter (or Accelerate). For Supabase
// Postgres we use @prisma/adapter-pg with the pooled DATABASE_URL.
// Migrations use DIRECT_URL via prisma.config.ts.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Supabase Postgres rejects non-SSL connections. The Supabase
    // pooler presents a self-signed intermediate that Node's default
    // CA bundle cannot validate — traffic is still TLS-encrypted, we
    // just skip cert-chain authentication. Acceptable because we
    // reach the pooler by its specific hostname with a scoped
    // password; a MITM would still need to steal the creds.
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const rawPrisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = rawPrisma;

// In vacansee-au, transparently proxy .rooms and .timings to .aU_Rooms and .aU_Timings
// so existing queries map to Australia tables while keeping the schema unified.
export const prisma = new Proxy(rawPrisma, {
  get(target: any, prop: string | symbol) {
    if (prop === "rooms") return target.aU_Rooms;
    if (prop === "timings") return target.aU_Timings;
    return target[prop];
  },
}) as unknown as PrismaClient & {
  rooms: PrismaClient["aU_Rooms"];
  timings: PrismaClient["aU_Timings"];
};

export default prisma;
