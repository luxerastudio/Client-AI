import { DatabaseConnection } from './DatabaseConnection';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const db = new DatabaseConnection();
  
  try {
    await db.connect();
    
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', '001_create_security_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.disconnect();
  }
}

if (require.main === module) {
  runMigration();
}
