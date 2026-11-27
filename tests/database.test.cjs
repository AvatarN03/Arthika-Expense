require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, existsSync, unlinkSync, rmdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { connect } = require('./sqlite-helper.cjs');
const { initializeDatabase } = require('../src/database/initialize.ts');
const { migrateDatabase } = require('../src/database/migrations/index.ts');
const { runDatabaseChecks, fixtureMigrations } = require('./database-fixtures.ts');

test('production migrations initialize repeatedly with no seeded financial data', async () => {
  const client = connect();
  try {
    await initializeDatabase(client);
    await initializeDatabase(client);
    assert.equal((await client.withSession((db) => db.getFirstAsync('PRAGMA user_version'))).user_version, 2);
    const tables = await client.withSession((db) => db.getAllAsync("SELECT name FROM sqlite_master WHERE type = 'table'"));
    assert.deepEqual(tables.map((row) => row.name).sort(), ['money_sources', 'transactions']);
    assert.equal((await client.withSession((db) => db.getFirstAsync('SELECT COUNT(*) AS count FROM money_sources'))).count, 0);
    assert.equal((await client.withSession((db) => db.getFirstAsync('SELECT COUNT(*) AS count FROM transactions'))).count, 0);
  } finally { await client.close(); }
});

test('migrations, binding, foreign keys, rollback and concurrent isolation use real SQLite', async () => {
  const client = connect();
  try { assert.equal((await runDatabaseChecks(client)).length, 6); }
  finally { await client.close(); }
});

test('rejects migration gaps and a newer database without downgrading', async () => {
  const client = connect();
  try {
    await assert.rejects(migrateDatabase(client, [fixtureMigrations[1]]), /consecutively/);
    await client.withSession((db) => db.execAsync('PRAGMA user_version = 99'));
    await assert.rejects(migrateDatabase(client, fixtureMigrations), /newer/);
    assert.equal((await client.withSession((db) => db.getFirstAsync('PRAGMA user_version'))).user_version, 99);
  } finally { await client.close(); }
});

test('persists across fresh file connections and rejects access after close', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'arthika-db-test-'));
  const filename = join(directory, 'isolated.db');
  let client = connect(filename);
  try {
    await runDatabaseChecks(client);
    await client.close();
    await assert.rejects(client.withSession((db) => db.getFirstAsync('SELECT 1')), /closing/);
    client = connect(filename);
    await initializeDatabase(client, { steps: fixtureMigrations });
    assert.equal((await client.withSession((db) => db.getFirstAsync('SELECT COUNT(*) AS count FROM test_parent'))).count, 2);
    assert.equal((await client.withSession((db) => db.getFirstAsync('PRAGMA journal_mode'))).journal_mode, 'wal');
  } finally {
    await client.close();
    // Remove only the known files in the test directory we just created.
    for (const suffix of ['', '-wal', '-shm']) {
      if (existsSync(filename + suffix)) unlinkSync(filename + suffix);
    }
    rmdirSync(directory);
  }
});
