import { execSync } from 'child_process';

async function resolveMigrations() {
  try {
    console.log('🔧 Checking for failed migrations...');
    
    // Try to resolve the specific failed migration
    try {
      execSync('npx prisma migrate resolve --applied 20251127113159_remove_order_id_unique_constraint', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log('✅ Migration resolved successfully');
    } catch (error) {
      console.log('⚠️ No failed migration to resolve or already resolved');
    }
    
    // Now run migrations normally
    console.log('🔄 Running database migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Migrations completed successfully');
    
  } catch (error) {
    console.error('❌ Error resolving migrations:', error);
    process.exit(1);
  }
}

resolveMigrations();

