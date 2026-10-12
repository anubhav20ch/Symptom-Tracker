const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let dbMode = 'postgres';
let pgPool = null;
let sqliteDb = null;

// Ensure local data dir exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqliteFilePath = path.join(dataDir, 'symptomlog.sqlite');

function initSqlite() {
  if (!sqliteDb) {
    sqliteDb = new Database(sqliteFilePath);
    sqliteDb.pragma('foreign_keys = ON');
    sqliteDb.pragma('journal_mode = WAL');
    console.log(`[DB] Initialized embedded SQLite database at: ${sqliteFilePath}`);
  }
  return sqliteDb;
}

async function testPostgres() {
  const databaseUrl =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/symptomlog';
  try {
    const pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 2000
    });
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    pgPool = pool;
    dbMode = 'postgres';
    console.log('[DB] Successfully connected to PostgreSQL database');
    return true;
  } catch (err) {
    console.warn(
      `[DB] PostgreSQL connection failed (${err.message}). Falling back to embedded SQLite.`
    );
    dbMode = 'sqlite';
    initSqlite();
    return false;
  }
}

// Convert PostgreSQL $1, $2 placeholders to SQLite ? placeholders
// Convert PostgreSQL $1, $2 indexed placeholders to SQLite ? and reorder params
function mapPgQueryAndParamsForSqlite(sql, params) {
  const paramIndices = [];
  let sqliteSql = sql.replace(/\$(\d+)/g, (match, index) => {
    paramIndices.push(parseInt(index, 10) - 1);
    return '?';
  });

  sqliteSql = sqliteSql.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  sqliteSql = sqliteSql.replace(/BOOLEAN/gi, 'INTEGER');
  sqliteSql = sqliteSql.replace(/TRUE/gi, '1');
  sqliteSql = sqliteSql.replace(/FALSE/gi, '0');

  const remappedParams =
    paramIndices.length > 0
      ? paramIndices.map((idx) => (idx < params.length ? params[idx] : null))
      : params;

  return { sqliteSql, remappedParams };
}

async function query(sql, params = []) {
  if (dbMode === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query(sql, params);
      return res;
    } catch (err) {
      console.warn(`[DB] PG query error (${err.message}), attempting fallback...`);
      throw err;
    }
  } else {
    // SQLite Mode
    const db = initSqlite();
    const { sqliteSql: cleanSql, remappedParams } = mapPgQueryAndParamsForSqlite(sql, params);

    // Check if query is SELECT / RETURNING
    const isSelect =
      cleanSql.toUpperCase().startsWith('SELECT') || cleanSql.toUpperCase().startsWith('PRAGMA');
    const hasReturning = /RETURNING\s+/i.test(cleanSql);

    try {
      if (isSelect) {
        const stmt = db.prepare(cleanSql);
        const rows = stmt.all(...remappedParams);
        return { rows, rowCount: rows.length };
      } else if (hasReturning) {
        try {
          const stmt = db.prepare(cleanSql);
          const rows = stmt.all(...remappedParams);
          return { rows, rowCount: rows.length };
        } catch (returnErr) {
          const sqlWithoutReturning = cleanSql.replace(/RETURNING\s+[\s\S]+/i, '').trim();
          const stmt = db.prepare(sqlWithoutReturning);
          const info = stmt.run(...remappedParams);
          return { rows: [{ id: info.lastInsertRowid }], rowCount: info.changes };
        }
      } else {
        const stmt = db.prepare(cleanSql);
        const info = stmt.run(...remappedParams);
        return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid };
      }
    } catch (sqliteErr) {
      console.error(`[DB Error in SQLite] SQL: ${cleanSql}`, sqliteErr);
      throw sqliteErr;
    }
  }
}

async function initDB() {
  await testPostgres();
  return { dbMode, query };
}

module.exports = {
  query,
  initDB,
  getDbMode: () => dbMode,
  getPool: () => pgPool,
  getSqlite: () => sqliteDb
};
