-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'DONE', 'CANCELED');

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderboardChannelId" TEXT,
    "leaderboardMessageId" TEXT,
    "logChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "assignedUserId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReceived" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_guildId_idx" ON "orders"("guildId");

-- CreateIndex
CREATE INDEX "orders_assignedUserId_idx" ON "orders"("assignedUserId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_archived_idx" ON "orders"("archived");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderId_guildId_key" ON "orders"("orderId", "guildId");

-- CreateIndex
CREATE INDEX "user_credits_guildId_idx" ON "user_credits"("guildId");

-- CreateIndex
CREATE INDEX "user_credits_userId_idx" ON "user_credits"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_credits_userId_guildId_key" ON "user_credits"("userId", "guildId");

