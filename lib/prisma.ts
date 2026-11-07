/**
 * Prisma client singleton.
 * Reuses a single PrismaClient instance across hot-reloads in development.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Retry wrapper for Neon serverless cold-start errors.
 * Neon auto-suspends idle compute; the first connection after a suspend
 * throws P1001 (can't reach server). We wait for the endpoint to wake
 * and retry up to twice before giving up.
 */
export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      if (code !== "P1001" && code !== "P1002") throw err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr;
}
