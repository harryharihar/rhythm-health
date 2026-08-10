// All persistence for this app goes through a local SQLite database (via
// expo-sqlite), stored in the device's internal app storage. Nothing here
// ever touches the network — there is no backend and no sync. Uninstalling
// the app removes this data.

import * as SQLite from 'expo-sqlite';

// A single shared promise for the whole app, assigned synchronously on the
// first call. Storage functions fire concurrently on startup (loadAll uses
// Promise.all), so if this were assigned only after an await resolved, every
// one of those concurrent calls would race past the check and each open its
// own separate connection.
let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('rhythm.db').then(async (db) => {
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}

async function runMigrations(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      age INTEGER,
      heightCm REAL,
      weightKg REAL,
      targetWeightKg REAL,
      gender TEXT,
      stepsGoal INTEGER,
      waterGoalMl INTEGER,
      sleepGoalHours REAL,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      darkMode INTEGER,
      remindersEnabled INTEGER
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id TEXT PRIMARY KEY,
      amountMl REAL,
      timestamp TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_water_logs_timestamp ON water_logs(timestamp);

    CREATE TABLE IF NOT EXISTS sleep_logs (
      id TEXT PRIMARY KEY,
      hours REAL,
      quality INTEGER,
      bedtime TEXT,
      wakeTime TEXT,
      timestamp TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sleep_logs_timestamp ON sleep_logs(timestamp);

    CREATE TABLE IF NOT EXISTS steps_logs (
      id TEXT PRIMARY KEY,
      count REAL,
      source TEXT,
      timestamp TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_steps_logs_timestamp ON steps_logs(timestamp);

    CREATE TABLE IF NOT EXISTS weight_logs (
      id TEXT PRIMARY KEY,
      weightKg REAL,
      timestamp TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_weight_logs_timestamp ON weight_logs(timestamp);
  `);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------- Profile ----------

export const DEFAULT_PROFILE = {
  name: '',
  age: null,
  heightCm: null,
  weightKg: null,
  targetWeightKg: null,
  gender: 'unspecified',
  goals: {
    stepsGoal: 10000,
    waterGoalMl: 2500,
    sleepGoalHours: 8,
  },
  createdAt: null,
};

function rowToProfile(row) {
  return {
    name: row.name || '',
    age: row.age,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    targetWeightKg: row.targetWeightKg,
    gender: row.gender || 'unspecified',
    goals: {
      stepsGoal: row.stepsGoal,
      waterGoalMl: row.waterGoalMl,
      sleepGoalHours: row.sleepGoalHours,
    },
    createdAt: row.createdAt,
  };
}

export async function getProfile() {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT * FROM profile WHERE id = 1');
  return row ? rowToProfile(row) : null;
}

export async function saveProfile(profile) {
  const db = await getDb();
  const withTimestamp = { ...profile, createdAt: profile.createdAt || new Date().toISOString() };
  const g = withTimestamp.goals || DEFAULT_PROFILE.goals;
  await db.runAsync(
    `INSERT INTO profile (id, name, age, heightCm, weightKg, targetWeightKg, gender, stepsGoal, waterGoalMl, sleepGoalHours, createdAt)
     VALUES (1, $name, $age, $heightCm, $weightKg, $targetWeightKg, $gender, $stepsGoal, $waterGoalMl, $sleepGoalHours, $createdAt)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, age = excluded.age, heightCm = excluded.heightCm, weightKg = excluded.weightKg,
       targetWeightKg = excluded.targetWeightKg, gender = excluded.gender, stepsGoal = excluded.stepsGoal,
       waterGoalMl = excluded.waterGoalMl, sleepGoalHours = excluded.sleepGoalHours, createdAt = excluded.createdAt`,
    {
      $name: withTimestamp.name,
      $age: withTimestamp.age,
      $heightCm: withTimestamp.heightCm,
      $weightKg: withTimestamp.weightKg,
      $targetWeightKg: withTimestamp.targetWeightKg,
      $gender: withTimestamp.gender,
      $stepsGoal: g.stepsGoal,
      $waterGoalMl: g.waterGoalMl,
      $sleepGoalHours: g.sleepGoalHours,
      $createdAt: withTimestamp.createdAt,
    }
  );
  return withTimestamp;
}

// ---------- Settings ----------

export const DEFAULT_SETTINGS = { darkMode: false, remindersEnabled: true };

export async function getSettings() {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT * FROM settings WHERE id = 1');
  if (!row) return DEFAULT_SETTINGS;
  return { darkMode: !!row.darkMode, remindersEnabled: !!row.remindersEnabled };
}

export async function saveSettings(settings) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (id, darkMode, remindersEnabled) VALUES (1, $darkMode, $remindersEnabled)
     ON CONFLICT(id) DO UPDATE SET darkMode = excluded.darkMode, remindersEnabled = excluded.remindersEnabled`,
    { $darkMode: settings.darkMode ? 1 : 0, $remindersEnabled: settings.remindersEnabled ? 1 : 0 }
  );
  return settings;
}

// ---------- Generic log table helpers (water / sleep / steps / weight) ----------

// `columns` lists the entry fields (besides id/timestamp) that this table stores.
function logTable(table, columns) {
  const allCols = ['id', 'timestamp', ...columns];
  const toParams = (row) => Object.fromEntries(allCols.map((c) => [`$${c}`, row[c] ?? null]));

  return {
    async all() {
      const db = await getDb();
      return db.getAllAsync(`SELECT * FROM ${table} ORDER BY timestamp DESC`);
    },
    async add(entry) {
      const db = await getDb();
      const row = { id: makeId(), timestamp: new Date().toISOString(), ...entry };
      await db.runAsync(
        `INSERT INTO ${table} (${allCols.join(', ')}) VALUES (${allCols.map((c) => `$${c}`).join(', ')})`,
        toParams(row)
      );
      return row;
    },
    async remove(id) {
      const db = await getDb();
      await db.runAsync(`DELETE FROM ${table} WHERE id = $id`, { $id: id });
      return this.all();
    },
    // Inserts a new entry with the given id, or replaces the existing one.
    // Used for the auto-tracked step total, which has one entry per day.
    async upsert(id, patch) {
      const db = await getDb();
      const existing = await db.getFirstAsync(`SELECT * FROM ${table} WHERE id = $id`, { $id: id });
      const row = { ...(existing || {}), ...patch, id, timestamp: new Date().toISOString() };
      const assignments = allCols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
      await db.runAsync(
        `INSERT INTO ${table} (${allCols.join(', ')}) VALUES (${allCols.map((c) => `$${c}`).join(', ')})
         ON CONFLICT(id) DO UPDATE SET ${assignments}`,
        toParams(row)
      );
      return row;
    },
    async clear() {
      const db = await getDb();
      await db.runAsync(`DELETE FROM ${table}`);
    },
  };
}

export const waterStore = logTable('water_logs', ['amountMl']);
export const sleepStore = logTable('sleep_logs', ['hours', 'quality', 'bedtime', 'wakeTime']);
export const stepsStore = logTable('steps_logs', ['count', 'source']);
export const weightStore = logTable('weight_logs', ['weightKg']);

// ---------- Danger zone ----------

export async function clearAllData() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM profile;
    DELETE FROM settings;
    DELETE FROM water_logs;
    DELETE FROM sleep_logs;
    DELETE FROM steps_logs;
    DELETE FROM weight_logs;
  `);
}

export async function exportAllData() {
  // Useful for a future "export my data" feature — reads everything back out
  // as one plain object, still entirely local.
  const [profile, settings, water, sleep, steps, weight] = await Promise.all([
    getProfile(),
    getSettings(),
    waterStore.all(),
    sleepStore.all(),
    stepsStore.all(),
    weightStore.all(),
  ]);
  return { profile, settings, water, sleep, steps, weight, exportedAt: new Date().toISOString() };
}
