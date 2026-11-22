const { DatabaseSync } = require('node:sqlite');
const { createDatabaseClient } = require('../src/database/client.ts');

// Real SQLite, adapted to the asynchronous Expo surface used by repositories.
exports.connect = function connect(filename = ':memory:') {
  const raw = new DatabaseSync(filename);
  return createDatabaseClient({
    execAsync: async (sql) => { raw.exec(sql); },
    runAsync: async (sql, ...args) => {
      const result = raw.prepare(sql).run(...args);
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    getFirstAsync: async (sql, ...args) => raw.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql, ...args) => raw.prepare(sql).all(...args),
    withTransactionAsync: async (task) => {
      raw.exec('BEGIN');
      try { await task(); raw.exec('COMMIT'); }
      catch (error) { raw.exec('ROLLBACK'); throw error; }
    },
    closeAsync: async () => { raw.close(); },
  });
};
