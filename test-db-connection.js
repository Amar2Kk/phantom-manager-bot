const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    console.log('Testing PostgreSQL connection...');
    console.log('Connection string starts with:', process.env.DATABASE_URL?.substring(0, 30) + '...');
    
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query executed successfully:', result.rows[0]);
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();

