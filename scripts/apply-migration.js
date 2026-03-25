#!/usr/bin/env node
/**
 * D1 Migration Script - Apply user system schema to Cloudflare D1
 * 
 * Usage:
 *   1. Make sure you're logged in: npx wrangler login
 *   2. Run: node scripts/apply-migration.js
 * 
 * Or with explicit token:
 *   CLOUDFLARE_API_TOKEN=xxx node scripts/apply-migration.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const D1_DATABASE_ID = '643d2e7e-79e2-44c1-ad6e-5d41933e12e2';
const MIGRATION_FILE = path.join(__dirname, '../drizzle/migrations/001_user_system.sql');

async function run() {
  console.log('🚀 Starting D1 migration...\n');

  // Read migration SQL
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute.\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const isAlter = stmt.toUpperCase().startsWith('ALTER');
    const isCreate = stmt.toUpperCase().startsWith('CREATE');
    
    if (isAlter) {
      console.log(`[${i + 1}/${statements.length}] ALTER: ${stmt.slice(0, 60)}...`);
    } else if (isCreate) {
      const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      console.log(`[${i + 1}/${statements.length}] CREATE: ${tableMatch ? tableMatch[1] : 'table'}`);
    }

    try {
      // Use wrangler d1 execute to run each statement
      const cmd = `npx wrangler d1 execute ai-background-remover-db --database-id=${D1_DATABASE_ID} --command="${stmt.replace(/"/g, '\\"')}" --yes`;
      execSync(cmd, { stdio: 'pipe' });
      console.log('  ✅ Done');
    } catch (err) {
      const errMsg = err.stderr?.toString() || err.message;
      // Ignore "duplicate column" and "table already exists" errors
      if (errMsg.includes('already exists') || errMsg.includes('Duplicate') || errMsg.includes('duplicate')) {
        console.log('  ⚠️  Already exists, skipping');
      } else {
        console.error(`  ❌ Error: ${errMsg.slice(0, 200)}`);
        process.exit(1);
      }
    }
  }

  console.log('\n✅ Migration completed successfully!');
  console.log('\nNext steps:');
  console.log('  1. Deploy the updated Worker: npx wrangler deploy --config worker/wrangler.toml');
  console.log('  2. Commit and push the migration file to GitHub');
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
