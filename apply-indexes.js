// Quick script to apply database indexes using Supabase client
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ihzkamfnctfreylyzgid.supabase.co';
const supabaseServiceKey = 'sb_secret_jnjttqCZH8LCi1rhAcPvpQ_TR_euezd';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read the migration file
const migrationSQL = fs.readFileSync('./supabase/migrations/20251004000000_add_performance_indexes.sql', 'utf8');

console.log('🔄 Applying database indexes...');
console.log('Migration file loaded successfully\n');

// Split into individual statements
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute\n`);

// Execute each statement
async function applyMigration() {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.startsWith('--')) continue;

    console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 80)}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      });

      if (error) {
        console.error(`❌ Failed: ${error.message}`);
        failed++;
      } else {
        console.log('✅ Success');
        success++;
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Successful: ${success}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All indexes created successfully!');
  } else {
    console.log('\n⚠️ Some indexes failed. Please check the errors above.');
  }
}

applyMigration().catch(console.error);
