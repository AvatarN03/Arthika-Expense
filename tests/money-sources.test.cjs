require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, existsSync, unlinkSync, rmdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { connect } = require('./sqlite-helper.cjs');
const { initializeDatabase } = require('../src/database/initialize.ts');
const { migrateDatabase, migrations } = require('../src/database/migrations/index.ts');
const { createMoneySourceRepository } = require('../src/database/repositories/money-sources.ts');
const { runMoneySourceChecks, verifyMoneySourcePersistence } = require('./money-source-checks.ts');

test('source repository rules run against real SQLite', async () => {
  const client = connect();
  try { assert.equal((await runMoneySourceChecks(client)).length, 6); }
  finally { await client.close(); }
});

test('version zero upgrades without erasing pre-existing records and repeated init preserves sources', async () => {
  const client = connect();
  try {
    await client.withSession((db) => db.execAsync("CREATE TABLE existing_data (value TEXT); INSERT INTO existing_data VALUES ('keep');"));
    await initializeDatabase(client);
    const repository = createMoneySourceRepository(client);
    const source = await repository.create({ name: 'Cash', type: 'cash', openingBalanceMinor: 0, currencyCode: 'INR' });
    await initializeDatabase(client);
    assert.deepEqual(await repository.getById(source.id), source);
    assert.equal((await client.withSession((db) => db.getFirstAsync('SELECT value FROM existing_data'))).value, 'keep');
  } finally { await client.close(); }
});

test('failed upgrade rolls back the production source schema and version together', async () => {
  const client = connect();
  try {
    await assert.rejects(migrateDatabase(client, [...migrations, {
      version: 2, name: 'intentional-test-failure', up: async () => { throw new Error('test rollback'); },
    }]), /test rollback/);
    assert.equal((await client.withSession((db) => db.getFirstAsync('PRAGMA user_version'))).user_version, 0);
    assert.equal(await client.withSession((db) => db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'money_sources'")), null);
    await initializeDatabase(client);
    assert.deepEqual(await createMoneySourceRepository(client).list(), []);
  } finally { await client.close(); }
});

test('source IDs, exact money, edits, archives and references survive a file reopen', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'arthika-sources-test-'));
  const filename = join(directory, 'isolated.db');
  let client = connect(filename);
  try {
    await runMoneySourceChecks(client);
    await client.close();
    client = connect(filename);
    await verifyMoneySourcePersistence(client);
  } finally {
    await client.close();
    for (const suffix of ['', '-wal', '-shm']) {
      if (existsSync(filename + suffix)) unlinkSync(filename + suffix);
    }
    rmdirSync(directory);
  }
});
