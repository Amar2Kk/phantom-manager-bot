import pg from 'pg';
const { Pool } = pg;

async function fixConstraint() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Checking and fixing database constraint...');
    
    // List ALL constraints on the orders table
    const allConstraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'orders';
    `);
    
    console.log('📋 Current constraints on orders table:', allConstraints.rows);
    
    // Check if the unique constraint exists
    const checkResult = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'orders' 
        AND constraint_name = 'orders_orderId_guildId_key'
        AND constraint_type = 'UNIQUE';
    `);

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Found unique constraint, removing it...');
      
      // Drop the unique constraint
      await pool.query(`ALTER TABLE "orders" DROP CONSTRAINT "orders_orderId_guildId_key";`);
      console.log('✅ Unique constraint removed');
      
      // Create regular index
      const indexCheck = await pool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'orders' 
          AND indexname = 'orders_orderId_guildId_idx';
      `);
      
      if (indexCheck.rows.length === 0) {
        await pool.query(`CREATE INDEX "orders_orderId_guildId_idx" ON "orders"("orderId", "guildId");`);
        console.log('✅ Regular index created');
      } else {
        console.log('✅ Regular index already exists');
      }
    } else {
      console.log('✅ Constraint already removed or does not exist');
      
      // Check for the index
      const indexCheck = await pool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'orders' 
          AND indexname = 'orders_orderId_guildId_idx';
      `);
      
      if (indexCheck.rows.length === 0) {
        console.log('📝 Creating regular index...');
        await pool.query(`CREATE INDEX "orders_orderId_guildId_idx" ON "orders"("orderId", "guildId");`);
        console.log('✅ Regular index created');
      }
    }
    
    // List all indexes on the orders table
    const allIndexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'orders';
    `);
    
    console.log('📋 Current indexes on orders table:');
    allIndexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing constraint:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixConstraint().catch((error) => {
  console.error('Failed to fix constraint:', error);
  process.exit(1);
});

