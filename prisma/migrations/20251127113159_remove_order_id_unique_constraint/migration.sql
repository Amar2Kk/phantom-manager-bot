-- Drop the unique constraint on (orderId, guildId) if it exists
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_orderId_guildId_key";

-- Create a regular index for faster lookups (not unique) if it doesn't exist
CREATE INDEX IF NOT EXISTS "orders_orderId_guildId_idx" ON "orders"("orderId", "guildId");

