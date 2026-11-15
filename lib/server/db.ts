import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDb = globalThis as unknown as { veltrixDb?: PrismaClient };
export function createDatabase(url: string) {
  if (!url)
    throw new Error(
      "DATABASE_URL is required. Configure PostgreSQL before starting the application.",
    );
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    }),
    log: ["warn"],
  });
}
export const db =
  globalDb.veltrixDb ?? createDatabase(process.env.DATABASE_URL ?? "");
if (process.env.NODE_ENV !== "production") globalDb.veltrixDb = db;
