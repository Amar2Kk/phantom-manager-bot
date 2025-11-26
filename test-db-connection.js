import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    console.log('Testing PostgreSQL connection...');
    console.log('Full DATABASE_URL:', process.env.DATABASE_URL);
    console.log('---');
    
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
    console.error('---');
    console.error('Pool config:', {
      host: pool.options.host,
      port: pool.options.port,
      database: pool.options.database,
      user: pool.options.user,
    });
    process.exit(1);
  }
}

testConnection();

