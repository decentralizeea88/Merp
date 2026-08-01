/* Versioned localStorage wrapper. All persistence goes through here so a
   schema change is one migration step rather than scattered breakage. */

export const SCHEMA_VERSION = 1;
const KEY = 'tibeb.save.v1';

export type PuzzleRecord = {
  completed: boolean;
  bestTimeMs: number | null;
  bestMoves: number | null;
  mastery: boolean;
};

export type SavedGame = {
  mode: 'sliding' | 'jigsaw';
  artworkId: string;
  size: number;
  imageMode: boolean;
  elapsedMs: number;
  moves: number;
  /* sliding: tile permutation; jigsaw: piece placements serialized by view */
  state: unknown;
};

export type SaveData = {
  version: number;
  records: Record<string, PuzzleRecord>;
  unlocked: string[];
  current: SavedGame | null;
  settings: {
    theme: 'light' | 'dark' | 'system';
    sound: boolean;
    reduceMotion: boolean;
  };
  daily: {
    lastPlayedKey: string | null;
    streak: number;
  };
};

const defaults = (): SaveData => ({
  version: SCHEMA_VERSION,
  records: {},
  unlocked: [],
  current: null,
  settings: { theme: 'system', sound: true, reduceMotion: false },
  daily: { lastPlayedKey: null, streak: 0 },
});

type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/* migrations[n] upgrades version n to n+1; runs in sequence up to SCHEMA_VERSION. */
const migrations: Record<number, Migration> = {};

const migrate = (raw: Record<string, unknown>): SaveData => {
  let data = raw;
  let v = typeof data['version'] === 'number' ? (data['version'] as number) : 0;
  if (v > SCHEMA_VERSION) return defaults();
  while (v < SCHEMA_VERSION) {
    const step = migrations[v];
    if (!step) return defaults();
    data = step(data);
    v = typeof data['version'] === 'number' ? (data['version'] as number) : v + 1;
  }
  return { ...defaults(), ...(data as Partial<SaveData>), version: SCHEMA_VERSION };
};

export const runMigrations = migrate;

let cache: SaveData | null = null;

export const load = (): SaveData => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? migrate(JSON.parse(raw) as Record<string, unknown>) : defaults();
  } catch {
    cache = defaults();
  }
  return cache;
};

const persist = (): void => {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full or unavailable — the game still plays, it just won't save */
  }
};

export const update = (fn: (data: SaveData) => void): SaveData => {
  const data = load();
  fn(data);
  persist();
  return data;
};

export const resetAll = (): void => {
  cache = defaults();
  persist();
};

export const puzzleKey = (mode: string, artworkId: string, size: number): string =>
  `${mode}:${artworkId}:${size}`;

export const getRecord = (key: string): PuzzleRecord => {
  const r = load().records[key];
  return r ?? { completed: false, bestTimeMs: null, bestMoves: null, mastery: false };
};
