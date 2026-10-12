const fs = require('fs');
const path = require('path');
const { initDB, query, getDbMode } = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Splits a .sql migration file into individual executable statements.
// Full-line "--" comments are stripped first: a statement preceded by a
// comment line would otherwise still start with "--" after trim() (the
// comment and the SQL share the same ';'-delimited chunk), which silently
// dropped the entire statement that followed it.
function splitStatements(sql) {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedVersions() {
  const res = await query('SELECT version FROM schema_migrations');
  return new Set(res.rows.map((r) => r.version));
}

// Versioned, idempotent migration runner: every .sql file under migrations/
// is applied at most once and tracked in schema_migrations, so re-running
// `npm run migrate` on an existing database only applies new files.
async function runMigrations() {
  console.log('[MIGRATE] Initializing database...');
  await initDB();
  const dbMode = getDbMode();
  console.log(`[MIGRATE] Running migrations for mode: ${dbMode}`);

  await ensureMigrationsTable();
  const applied = await getAppliedVersions();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[MIGRATE] Skipping already-applied migration: ${file}`);
      continue;
    }

    console.log(`[MIGRATE] Applying migration: ${file}`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const statements = splitStatements(sql);

    for (const stmt of statements) {
      try {
        await query(stmt + ';');
      } catch (err) {
        // Re-running ADD COLUMN / CREATE on a column or table that already
        // exists from a previous partial run is a no-op, not a failure.
        const msg = (err.message || '').toLowerCase();
        const alreadyExists = msg.includes('already exists') || msg.includes('duplicate column');
        if (!alreadyExists) {
          console.error(`[MIGRATE Error executing statement in ${file}]:\n${stmt}\n`, err.message);
          throw err;
        }
      }
    }

    await query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
  }

  console.log('[MIGRATE] All migrations applied successfully!');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[MIGRATE Failed]:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
