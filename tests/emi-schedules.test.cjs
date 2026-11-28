require("./register-typescript.cjs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { connect } = require("./sqlite-helper.cjs");
const { initializeDatabase } = require("../src/database/initialize.ts");
const {
  createMoneySourceRepository,
} = require("../src/database/repositories/money-sources.ts");
const {
  createEmiScheduleRepository,
} = require("../src/database/repositories/emi-schedules.ts");

test("EMI schedule repository creates and retrieves a schedule", async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const emis = createEmiScheduleRepository(client);

    const bank = await sources.create({
      name: "Main bank",
      type: "bank",
      openingBalanceMinor: 100000,
      currencyCode: "INR",
    });

    const schedule = await emis.create({
      name: "Home loan EMI",
      amountMinor: 2400000,
      currencyCode: "INR",
      sourceId: bank.id,
      frequency: "monthly",
      startDate: "2026-01-01",
      totalOccurrences: 240,
      notes: "20-year mortgage",
    });

    assert.equal(schedule.name, "Home loan EMI");
    assert.equal(schedule.amountMinor, 2400000);
    assert.equal(schedule.currencyCode, "INR");
    assert.equal(schedule.sourceId, bank.id);
    assert.equal(schedule.frequency, "monthly");
    assert.equal(schedule.startDate, "2026-01-01");
    assert.equal(schedule.totalOccurrences, 240);
    assert.equal(schedule.status, "active");
    assert.equal(schedule.notes, "20-year mortgage");

    const found = await emis.getById(schedule.id);
    assert.deepEqual(found, schedule);
  } finally {
    await client.close();
  }
});

test("EMI schedule with no total_occurrences is indefinite", async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const emis = createEmiScheduleRepository(client);

    const bank = await sources.create({
      name: "Bank",
      type: "bank",
      openingBalanceMinor: 50000,
      currencyCode: "INR",
    });

    const schedule = await emis.create({
      name: "Insurance premium",
      amountMinor: 600000,
      currencyCode: "INR",
      sourceId: bank.id,
      frequency: "quarterly",
      startDate: "2026-03-01",
    });

    assert.equal(schedule.totalOccurrences, null);
    assert.equal(schedule.notes, null);
  } finally {
    await client.close();
  }
});

test("EMI schedule list filters by status and sourceId", async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const emis = createEmiScheduleRepository(client);

    const bank = await sources.create({
      name: "Bank",
      type: "bank",
      openingBalanceMinor: 100000,
      currencyCode: "INR",
    });
    const wallet = await sources.create({
      name: "Wallet",
      type: "wallet",
      openingBalanceMinor: 10000,
      currencyCode: "INR",
    });

    const s1 = await emis.create({
      name: "Loan A",
      amountMinor: 100000,
      currencyCode: "INR",
      sourceId: bank.id,
      frequency: "monthly",
      startDate: "2026-01-01",
    });
    const s2 = await emis.create({
      name: "Loan B",
      amountMinor: 50000,
      currencyCode: "INR",
      sourceId: wallet.id,
      frequency: "weekly",
      startDate: "2026-02-01",
    });

    await emis.setStatus(s2.id, "paused");

    const all = await emis.list();
    assert.equal(all.length, 2);

    const active = await emis.list({ status: "active" });
    assert.equal(active.length, 1);
    assert.equal(active[0].id, s1.id);

    const paused = await emis.list({ status: "paused" });
    assert.equal(paused.length, 1);
    assert.equal(paused[0].id, s2.id);

    const bySource = await emis.list({ sourceId: bank.id });
    assert.equal(bySource.length, 1);
    assert.equal(bySource[0].id, s1.id);
  } finally {
    await client.close();
  }
});

test("EMI schedule updateDetails changes allowed fields only", async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const emis = createEmiScheduleRepository(client);

    const bank = await sources.create({
      name: "Bank",
      type: "bank",
      openingBalanceMinor: 100000,
      currencyCode: "INR",
    });

    const original = await emis.create({
      name: "Car loan",
      amountMinor: 850000,
      currencyCode: "INR",
      sourceId: bank.id,
      frequency: "monthly",
      startDate: "2026-06-01",
      totalOccurrences: 48,
    });

    const updated = await emis.updateDetails(original.id, {
      name: "Car loan (revised)",
      amountMinor: 870000,
      notes: "Revised due to interest change",
    });

    assert.equal(updated.name, "Car loan (revised)");
    assert.equal(updated.amountMinor, 870000);
    assert.equal(updated.notes, "Revised due to interest change");
    assert.equal(updated.frequency, original.frequency);
    assert.equal(updated.startDate, original.startDate);
    assert.equal(updated.totalOccurrences, original.totalOccurrences);
  } finally {
    await client.close();
  }
});

test("EMI schedule setStatus transitions correctly", async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const emis = createEmiScheduleRepository(client);

    const bank = await sources.create({
      name: "Bank",
      type: "bank",
      openingBalanceMinor: 100000,
      currencyCode: "INR",
    });

    const schedule = await emis.create({
      name: "Phone EMI",
      amountMinor: 220000,
      currencyCode: "INR",
      sourceId: bank.id,
      frequency: "monthly",
      startDate: "2026-11-01",
      totalOccurrences: 12,
    });

    assert.equal(schedule.status, "active");

    const paused = await emis.setStatus(schedule.id, "paused");
    assert.equal(paused.status, "paused");

    const resumed = await emis.setStatus(schedule.id, "active");
    assert.equal(resumed.status, "active");

    const completed = await emis.setStatus(schedule.id, "completed");
    assert.equal(completed.status, "completed");
  } finally {
    await client.close();
  }
});

test("EMI schedule rejects archived or missing source", async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const emis = createEmiScheduleRepository(client);

    const bank = await sources.create({
      name: "Bank",
      type: "bank",
      openingBalanceMinor: 10000,
      currencyCode: "INR",
    });
    await sources.archive(bank.id);

    await assert.rejects(
      () =>
        emis.create({
          name: "Loan",
          amountMinor: 100000,
          currencyCode: "INR",
          sourceId: bank.id,
          frequency: "monthly",
          startDate: "2026-01-01",
        }),
      /unavailable/,
    );

    await assert.rejects(
      () =>
        emis.create({
          name: "Loan",
          amountMinor: 100000,
          currencyCode: "INR",
          sourceId: "nonexistent-id",
          frequency: "monthly",
          startDate: "2026-01-01",
        }),
      /unavailable/,
    );
  } finally {
    await client.close();
  }
});

test("EMI schedule validation rejects bad input", async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const emis = createEmiScheduleRepository(client);

    const bank = await sources.create({
      name: "Bank",
      type: "bank",
      openingBalanceMinor: 10000,
      currencyCode: "INR",
    });

    await assert.rejects(
      () =>
        emis.create({
          name: "",
          amountMinor: 100000,
          currencyCode: "INR",
          sourceId: bank.id,
          frequency: "monthly",
          startDate: "2026-01-01",
        }),
      /name is required/i,
    );

    await assert.rejects(
      () =>
        emis.create({
          name: "Loan",
          amountMinor: 0,
          currencyCode: "INR",
          sourceId: bank.id,
          frequency: "monthly",
          startDate: "2026-01-01",
        }),
      /positive safe integer/i,
    );

    await assert.rejects(
      () =>
        emis.create({
          name: "Loan",
          amountMinor: 100000,
          currencyCode: "inr",
          sourceId: bank.id,
          frequency: "monthly",
          startDate: "2026-01-01",
        }),
      /three uppercase letters/i,
    );

    await assert.rejects(
      () =>
        emis.create({
          name: "Loan",
          amountMinor: 100000,
          currencyCode: "INR",
          sourceId: bank.id,
          frequency: "biweekly",
          startDate: "2026-01-01",
        }),
      /frequency/i,
    );

    await assert.rejects(
      () =>
        emis.create({
          name: "Loan",
          amountMinor: 100000,
          currencyCode: "INR",
          sourceId: bank.id,
          frequency: "monthly",
          startDate: "01-01-2026",
        }),
      /YYYY-MM-DD/i,
    );

    await assert.rejects(
      () =>
        emis.create({
          name: "Loan",
          amountMinor: 100000,
          currencyCode: "INR",
          sourceId: bank.id,
          frequency: "monthly",
          startDate: "2026-01-01",
          totalOccurrences: 0,
        }),
      /positive integer/i,
    );
  } finally {
    await client.close();
  }
});

test("EMI schedule getById returns null for unknown id", async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    await initializeDatabase(client, { enableWAL: false });
    const emis = createEmiScheduleRepository(client);
    const result = await emis.getById("nonexistent");
    assert.equal(result, null);
  } finally {
    await client.close();
  }
});

test("EMI schedule persists across a close/reopen", async () => {
  const { mkdtempSync } = require("node:fs");
  const { tmpdir } = require("node:os");
  const { join } = require("node:path");

  const dir = mkdtempSync(join(tmpdir(), "arthika-emi-test-"));
  const dbPath = join(dir, "arthika.db");

  let client = connect(dbPath);
  let scheduleId;
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const emis = createEmiScheduleRepository(client);

    const bank = await sources.create({
      name: "Bank",
      type: "bank",
      openingBalanceMinor: 100000,
      currencyCode: "INR",
    });
    const schedule = await emis.create({
      name: "Persistent loan",
      amountMinor: 150000,
      currencyCode: "INR",
      sourceId: bank.id,
      frequency: "monthly",
      startDate: "2026-01-15",
      totalOccurrences: 24,
    });
    scheduleId = schedule.id;
  } finally {
    await client.close();
  }

  client = connect(dbPath);
  try {
    await initializeDatabase(client, { enableWAL: false });
    const emis = createEmiScheduleRepository(client);
    const found = await emis.getById(scheduleId);
    assert.ok(found, "Schedule must survive a close/reopen");
    assert.equal(found.name, "Persistent loan");
    assert.equal(found.amountMinor, 150000);
    assert.equal(found.startDate, "2026-01-15");
    assert.equal(found.totalOccurrences, 24);
  } finally {
    await client.close();
  }
});
