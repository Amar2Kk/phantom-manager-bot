import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Example: Create a test guild
  const testGuild = await prisma.guild.upsert({
    where: { id: 'test-guild-id' },
    update: {},
    create: {
      id: 'test-guild-id',
      name: 'Test Guild',
    },
  });

  console.log('✅ Created test guild:', testGuild.name);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

