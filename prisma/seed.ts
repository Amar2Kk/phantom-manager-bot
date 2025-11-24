import { withAccelerate } from '@prisma/extension-accelerate';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  console.log('🌱 Seeding database...');

  // Example: Create a test guild
  const testGuild = await prisma.guild.upsert({
    where: { id: 'test-guild-id' },
    update: {},
    create: {
      id: 'test-guild-id',
      name: 'Test Guild',
      prefix: '!',
    },
  });

  console.log('✅ Created test guild:', testGuild.name);

  // Example: Create a test user
  const testUser = await prisma.user.upsert({
    where: { id: 'test-user-id' },
    update: {},
    create: {
      id: 'test-user-id',
      username: 'TestUser',
      globalXp: 100,
    },
  });

  console.log('✅ Created test user:', testUser.username);

  // Example: Create guild user data
  const guildUser = await prisma.guildUser.upsert({
    where: {
      userId_guildId: {
        userId: testUser.id,
        guildId: testGuild.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      guildId: testGuild.id,
      xp: 500,
      level: 5,
      messages: 100,
    },
  });

  console.log('✅ Created guild user data');

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

