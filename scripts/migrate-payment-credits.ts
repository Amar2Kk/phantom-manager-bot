import { PrismaClient, OrderStatus } from '@prisma/client';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function migratePaymentCredits() {
  console.log('🔄 Starting payment credits migration...\n');

  try {
    // Find all orders that are DONE and have payment received
    const ordersWithPayment = await prisma.order.findMany({
      where: {
        status: OrderStatus.DONE,
        paymentReceived: true,
        archived: false,
      },
      include: {
        _count: true,
      },
    });

    console.log(`📊 Found ${ordersWithPayment.length} orders with payment marked as received\n`);

    if (ordersWithPayment.length === 0) {
      console.log('✅ No orders to migrate. All done!');
      return;
    }

    // Group by user and guild to calculate total deductions
    const creditAdjustments = new Map<string, { userId: string; guildId: string; amount: number; orders: string[] }>();

    for (const order of ordersWithPayment) {
      const key = `${order.assignedUserId}_${order.guildId}`;
      
      if (!creditAdjustments.has(key)) {
        creditAdjustments.set(key, {
          userId: order.assignedUserId,
          guildId: order.guildId,
          amount: 0,
          orders: [],
        });
      }

      const adjustment = creditAdjustments.get(key)!;
      adjustment.amount += order.price;
      adjustment.orders.push(order.orderId);
    }

    console.log(`👥 Affecting ${creditAdjustments.size} users\n`);

    // Apply credit deductions
    let successCount = 0;
    let errorCount = 0;

    for (const [key, adjustment] of creditAdjustments) {
      try {
        // Ensure user credit record exists
        await prisma.userCredit.upsert({
          where: {
            userId_guildId: {
              userId: adjustment.userId,
              guildId: adjustment.guildId,
            },
          },
          update: {},
          create: {
            userId: adjustment.userId,
            guildId: adjustment.guildId,
            credits: 0,
          },
        });

        // Get current credits
        const currentCredits = await prisma.userCredit.findUnique({
          where: {
            userId_guildId: {
              userId: adjustment.userId,
              guildId: adjustment.guildId,
            },
          },
        });

        // Deduct credits for paid orders
        const updatedCredits = await prisma.userCredit.update({
          where: {
            userId_guildId: {
              userId: adjustment.userId,
              guildId: adjustment.guildId,
            },
          },
          data: {
            credits: {
              decrement: adjustment.amount,
            },
          },
        });

        console.log(`✅ User ${adjustment.userId} (Guild: ${adjustment.guildId})`);
        console.log(`   Orders: ${adjustment.orders.join(', ')}`);
        console.log(`   Deducted: $${adjustment.amount.toFixed(2)}`);
        console.log(`   Credits: $${currentCredits?.credits.toFixed(2) || '0.00'} → $${updatedCredits.credits.toFixed(2)}`);
        console.log('');

        successCount++;
      } catch (error) {
        console.error(`❌ Error processing user ${adjustment.userId}:`, error);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount} users`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total orders processed: ${ordersWithPayment.length}`);
    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migratePaymentCredits();

