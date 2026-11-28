import type { DatabaseSession } from '../client';

export async function createEmiSchedules(session: DatabaseSession): Promise<void> {
  // Stores recurring payment commitments (loans, insurance, subscriptions).
  // Each schedule generates occurrences on demand; occurrences are not stored
  // as rows — they are derived from start_date, frequency, and total_occurrences.
  // Payments are recorded as linked expense transactions (Phase 7.6).
  await session.execAsync(`
    CREATE TABLE emi_schedules (
      id              TEXT    PRIMARY KEY NOT NULL
                              DEFAULT (lower(hex(randomblob(16)))),
      name            TEXT    NOT NULL CHECK (
                                length(trim(name)) > 0
                                AND instr(name, char(0)) = 0
                              ),
      amount_minor    INTEGER NOT NULL CHECK (
                                typeof(amount_minor) = 'integer'
                                AND amount_minor > 0
                              ),
      currency_code   TEXT    NOT NULL CHECK (length(currency_code) = 3),
      source_id       TEXT    NOT NULL
                              REFERENCES money_sources(id)
                                ON UPDATE RESTRICT ON DELETE RESTRICT,
      frequency       TEXT    NOT NULL CHECK (
                                frequency IN ('monthly', 'weekly', 'quarterly')
                              ),
      start_date      TEXT    NOT NULL CHECK (
                                length(start_date) = 10
                                AND substr(start_date, 5, 1) = '-'
                                AND substr(start_date, 8, 1) = '-'
                                AND julianday(start_date) IS NOT NULL
                              ),
      total_occurrences INTEGER CHECK (
                                total_occurrences IS NULL
                                OR (typeof(total_occurrences) = 'integer'
                                    AND total_occurrences > 0)
                              ),
      status          TEXT    NOT NULL DEFAULT 'active' CHECK (
                                status IN ('active', 'paused', 'completed')
                              ),
      notes           TEXT    CHECK (
                                notes IS NULL
                                OR (length(trim(notes)) > 0
                                    AND instr(notes, char(0)) = 0)
                              ),
      created_at      TEXT    NOT NULL CHECK (
                                length(created_at) = 24
                                AND substr(created_at, 24, 1) = 'Z'
                                AND julianday(created_at) IS NOT NULL
                              ),
      updated_at      TEXT    NOT NULL CHECK (
                                length(updated_at) = 24
                                AND substr(updated_at, 24, 1) = 'Z'
                                AND julianday(updated_at) IS NOT NULL
                              )
    );
    CREATE INDEX emi_schedules_source
      ON emi_schedules(source_id, created_at DESC, id DESC);
    CREATE INDEX emi_schedules_status
      ON emi_schedules(status, start_date, id);
  `);
}
