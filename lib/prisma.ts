import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/app/generated/prisma/client"

const connectionString = process.env.DATABASE_URL

function createPrismaClient(): PrismaClient {
  // The client is engine-free (queryCompiler), so a driver adapter is
  // required. We connect directly to Postgres via the pg driver adapter.
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Cache the client on `global` in development so hot reloads reuse a single
// instance instead of exhausting the connection pool.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
