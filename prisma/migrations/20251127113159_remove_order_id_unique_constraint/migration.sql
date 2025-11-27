-- Drop the unique constraint on (orderId, guildId)
ALTER TABLE "orders" DROP CONSTRAINT "orders_orderId_guildId_key";

-- Create a regular index for faster lookups (not unique)
CREATE INDEX "orders_orderId_guildId_idx" ON "orders"("orderId", "guildId");

