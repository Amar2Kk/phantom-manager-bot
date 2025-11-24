import { db } from '../src/utils/database';

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    await db.$connect();
    console.log('✅ Connected to database');
    
    // Create test guild
    const guild = await db.guild.create({
      data: {
        id: 'test-guild-' + Date.now(),
        name: 'Test Guild',
        prefix: '!',
      },
    });
    console.log('✅ Created test guild:', guild.name);
    
    // Create test user
    const user = await db.user.create({
      data: {
        id: 'test-user-' + Date.now(),
        username: 'TestUser',
      },
    });
    console.log('✅ Created test user:', user.username);
    
    // Query all guilds
    const guilds = await db.guild.findMany();
    console.log(`✅ Found ${guilds.length} guild(s) in database`);
    
    // Query all users
    const users = await db.user.findMany();
    console.log(`✅ Found ${users.length} user(s) in database`);
    
    console.log('\n🎉 Database is working perfectly!');
    
  } catch (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

testDatabase();

