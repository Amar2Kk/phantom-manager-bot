import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { logger } from './logger';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

// Create connection pool
const pool = globalForPrisma.pool ?? new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://phantom_user:phantom_password@localhost:5432/phantom_bot',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: false,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool;
}

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma Client with adapter
export const db = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect();
  logger.info('Database disconnected');
});

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await db.$connect();
    logger.info('Database connection established');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    return false;
  }
}

