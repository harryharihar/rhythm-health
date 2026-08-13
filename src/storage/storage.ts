// All persistence for this app goes through a local SQLite database (via
// expo-sqlite), stored in the device's internal app storage. Nothing here
// ever touches the network — there is no backend and no sync. Uninstalling
// the app removes this data.

import * as SQLite from 'expo-sqlite';
import type { Meal, Profile, Reminder, ReminderCategory, ReminderMode, Settings, SleepLog, StepsLog, WaterLog, WeightLog, Workout } from '../types/models';

// A single shared promise for the whole app, assigned synchronously on the
// first call. Storage functions fire concurrently on startup (loadAll uses
// Promise.all), so if this were assigned only after an await resolved, every
// one of those concurrent calls would race past the check and each open its
// own separate connection.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('rhythm.db').then(async (db) => {
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
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
      remindersEnabled INTEGER,
      notificationTime TEXT
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

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      type TEXT,
      durationMin REAL,
      caloriesKcal REAL,
      distanceKm REAL,
      timestamp TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_workouts_timestamp ON workouts(timestamp);

    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      mealType TEXT,
      name TEXT,
      caloriesKcal REAL,
      proteinG REAL,
      carbsG REAL,
      fatsG REAL,
      timestamp TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_meals_timestamp ON meals(timestamp);

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      category TEXT,
      label TEXT,
      mode TEXT,
      time TEXT,
      intervalMinutes INTEGER,
      enabled INTEGER,
      timestamp TEXT
    );
  `);

  // Columns added after the initial release — CREATE TABLE IF NOT EXISTS above
  // won't add them to tables that already exist on-device.
  await addColumnIfMissing(db, 'settings', 'notificationTime', 'TEXT');
  await addColumnIfMissing(db, 'reminders', 'mode', 'TEXT');
  await addColumnIfMissing(db, 'reminders', 'intervalMinutes', 'INTEGER');
  await addColumnIfMissing(db, 'profile', 'calorieGoal', 'INTEGER');
  await addColumnIfMissing(db, 'profile', 'proteinGoalG', 'REAL');
  await addColumnIfMissing(db, 'profile', 'carbsGoalG', 'REAL');
  await addColumnIfMissing(db, 'profile', 'fatsGoalG', 'REAL');
  await addColumnIfMissing(db, 'profile', 'bedtimeGoal', 'TEXT');
  await addColumnIfMissing(db, 'profile', 'wakeTimeGoal', 'TEXT');
}

async function addColumnIfMissing(db: SQLite.SQLiteDatabase, table: string, column: string, sqlType: string) {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlType}`);
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------- Profile ----------

export const DEFAULT_PROFILE: Profile = {
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
    calorieGoal: 2100,
    proteinGoalG: 120,
    carbsGoalG: 220,
    fatsGoalG: 70,
    bedtimeGoal: null, // "HH:mm" 24h, e.g. "23:00" — null until the user sets one (in Profile or from the first Sleep log)
    wakeTimeGoal: null,
  },
  createdAt: null,
};

function rowToProfile(row: any): Profile {
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
      calorieGoal: row.calorieGoal ?? DEFAULT_PROFILE.goals.calorieGoal,
      proteinGoalG: row.proteinGoalG ?? DEFAULT_PROFILE.goals.proteinGoalG,
      carbsGoalG: row.carbsGoalG ?? DEFAULT_PROFILE.goals.carbsGoalG,
      fatsGoalG: row.fatsGoalG ?? DEFAULT_PROFILE.goals.fatsGoalG,
      bedtimeGoal: row.bedtimeGoal ?? null,
      wakeTimeGoal: row.wakeTimeGoal ?? null,
    },
    createdAt: row.createdAt,
  };
}

export async function getProfile(): Promise<Profile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM profile WHERE id = 1');
  return row ? rowToProfile(row) : null;
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const db = await getDb();
  const withTimestamp = { ...profile, createdAt: profile.createdAt || new Date().toISOString() };
  const g = withTimestamp.goals || DEFAULT_PROFILE.goals;
  await db.runAsync(
    `INSERT INTO profile (id, name, age, heightCm, weightKg, targetWeightKg, gender, stepsGoal, waterGoalMl, sleepGoalHours, calorieGoal, proteinGoalG, carbsGoalG, fatsGoalG, bedtimeGoal, wakeTimeGoal, createdAt)
     VALUES (1, $name, $age, $heightCm, $weightKg, $targetWeightKg, $gender, $stepsGoal, $waterGoalMl, $sleepGoalHours, $calorieGoal, $proteinGoalG, $carbsGoalG, $fatsGoalG, $bedtimeGoal, $wakeTimeGoal, $createdAt)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, age = excluded.age, heightCm = excluded.heightCm, weightKg = excluded.weightKg,
       targetWeightKg = excluded.targetWeightKg, gender = excluded.gender, stepsGoal = excluded.stepsGoal,
       waterGoalMl = excluded.waterGoalMl, sleepGoalHours = excluded.sleepGoalHours,
       calorieGoal = excluded.calorieGoal, proteinGoalG = excluded.proteinGoalG,
       carbsGoalG = excluded.carbsGoalG, fatsGoalG = excluded.fatsGoalG,
       bedtimeGoal = excluded.bedtimeGoal, wakeTimeGoal = excluded.wakeTimeGoal, createdAt = excluded.createdAt`,
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
      $calorieGoal: g.calorieGoal ?? DEFAULT_PROFILE.goals.calorieGoal,
      $proteinGoalG: g.proteinGoalG ?? DEFAULT_PROFILE.goals.proteinGoalG,
      $carbsGoalG: g.carbsGoalG ?? DEFAULT_PROFILE.goals.carbsGoalG,
      $fatsGoalG: g.fatsGoalG ?? DEFAULT_PROFILE.goals.fatsGoalG,
      $bedtimeGoal: g.bedtimeGoal ?? null,
      $wakeTimeGoal: g.wakeTimeGoal ?? null,
      $createdAt: withTimestamp.createdAt,
    }
  );
  return withTimestamp;
}

// ---------- Settings ----------

export const DEFAULT_SETTINGS: Settings = { darkMode: true, remindersEnabled: true, notificationTime: '9:00 PM' };

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM settings WHERE id = 1');
  if (!row) return DEFAULT_SETTINGS;
  return {
    darkMode: !!row.darkMode,
    remindersEnabled: !!row.remindersEnabled,
    notificationTime: row.notificationTime || DEFAULT_SETTINGS.notificationTime,
  };
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (id, darkMode, remindersEnabled, notificationTime) VALUES (1, $darkMode, $remindersEnabled, $notificationTime)
     ON CONFLICT(id) DO UPDATE SET darkMode = excluded.darkMode, remindersEnabled = excluded.remindersEnabled, notificationTime = excluded.notificationTime`,
    {
      $darkMode: settings.darkMode ? 1 : 0,
      $remindersEnabled: settings.remindersEnabled ? 1 : 0,
      $notificationTime: settings.notificationTime || DEFAULT_SETTINGS.notificationTime,
    }
  );
  return settings;
}

// ---------- Generic log table helpers (water / sleep / steps / weight) ----------

export interface LogStore<T extends { id: string; timestamp: string }> {
  all(): Promise<T[]>;
  add(entry: Omit<T, 'id' | 'timestamp'>): Promise<T>;
  remove(id: string): Promise<T[]>;
  upsert(id: string, patch: Partial<Omit<T, 'id' | 'timestamp'>>): Promise<T>;
  clear(): Promise<void>;
}

// `columns` lists the entry fields (besides id/timestamp) that this table stores.
function logTable<T extends { id: string; timestamp: string }>(table: string, columns: string[]): LogStore<T> {
  const allCols = ['id', 'timestamp', ...columns];
  const toParams = (row: any) => Object.fromEntries(allCols.map((c) => [`$${c}`, row[c] ?? null]));

  return {
    async all() {
      const db = await getDb();
      return db.getAllAsync<T>(`SELECT * FROM ${table} ORDER BY timestamp DESC`);
    },
    async add(entry) {
      const db = await getDb();
      const row = { id: makeId(), timestamp: new Date().toISOString(), ...entry } as unknown as T;
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
      const existing = await db.getFirstAsync<any>(`SELECT * FROM ${table} WHERE id = $id`, { $id: id });
      const row = { ...(existing || {}), ...patch, id, timestamp: new Date().toISOString() } as T;
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

export const waterStore = logTable<WaterLog>('water_logs', ['amountMl']);
export const sleepStore = logTable<SleepLog>('sleep_logs', ['hours', 'quality', 'bedtime', 'wakeTime']);
export const stepsStore = logTable<StepsLog>('steps_logs', ['count', 'source']);
export const weightStore = logTable<WeightLog>('weight_logs', ['weightKg']);
export const workoutStore = logTable<Workout>('workouts', ['type', 'durationMin', 'caloriesKcal', 'distanceKm']);
export const mealStore = logTable<Meal>('meals', ['mealType', 'name', 'caloriesKcal', 'proteinG', 'carbsG', 'fatsG']);

// ---------- Reminders ----------
// Wraps the generic logTable so callers work with a real boolean `enabled`
// instead of SQLite's 0/1 — the same pattern getSettings/saveSettings use
// for `darkMode`/`remindersEnabled`.

interface ReminderRow {
  id: string;
  timestamp: string;
  category: ReminderCategory;
  label: string;
  mode: ReminderMode;
  time: string | null;
  intervalMinutes: number | null;
  enabled: number;
}

const remindersTable = logTable<ReminderRow>('reminders', ['category', 'label', 'mode', 'time', 'intervalMinutes', 'enabled']);

function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    timestamp: row.timestamp,
    category: row.category,
    label: row.label,
    mode: row.mode || 'daily',
    time: row.time,
    intervalMinutes: row.intervalMinutes,
    enabled: !!row.enabled,
  };
}

type ReminderInput = { category: ReminderCategory; label: string; mode: ReminderMode; time: string | null; intervalMinutes: number | null; enabled: boolean };

export const remindersStore = {
  async all(): Promise<Reminder[]> {
    const rows = await remindersTable.all();
    return rows.map(rowToReminder);
  },
  async add(entry: ReminderInput): Promise<Reminder> {
    const row = await remindersTable.add({ ...entry, enabled: entry.enabled ? 1 : 0 });
    return rowToReminder(row);
  },
  async update(id: string, patch: Partial<ReminderInput>): Promise<Reminder> {
    const { enabled, ...rest } = patch;
    const dbPatch: Partial<ReminderRow> = { ...rest };
    if (typeof enabled === 'boolean') dbPatch.enabled = enabled ? 1 : 0;
    const row = await remindersTable.upsert(id, dbPatch);
    return rowToReminder(row);
  },
  async remove(id: string): Promise<Reminder[]> {
    const rows = await remindersTable.remove(id);
    return rows.map(rowToReminder);
  },
};

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
    DELETE FROM workouts;
    DELETE FROM meals;
    DELETE FROM reminders;
  `);
}

export async function exportAllData() {
  // Useful for a future "export my data" feature — reads everything back out
  // as one plain object, still entirely local.
  const [profile, settings, water, sleep, steps, weight, workouts, meals] = await Promise.all([
    getProfile(),
    getSettings(),
    waterStore.all(),
    sleepStore.all(),
    stepsStore.all(),
    weightStore.all(),
    workoutStore.all(),
    mealStore.all(),
  ]);
  return { profile, settings, water, sleep, steps, weight, workouts, meals, exportedAt: new Date().toISOString() };
}
