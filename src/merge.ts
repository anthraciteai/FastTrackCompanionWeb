import type {
  ExerciseLog,
  FastingSession,
  FoodLog,
  Profile,
  PrefsBlob,
  ScheduleEvent,
  Snapshot,
  WaterLog,
  WorkoutSession,
} from "./types.ts";

const defaultProfile: Profile = {
  displayName: "Athlete",
  sex: "OTHER",
  birthYear: 1995,
  heightCm: 175,
  weightKg: 80,
  goalWeightKg: 72,
  activityLevel: "MODERATE",
  goal: "LOSE",
  fastingProtocol: "SIXTEEN_EIGHT",
  unitSystem: "IMPERIAL",
  dietType: "BALANCED",
  dietaryRestrictions: "",
};

export function emptySnapshot(): Snapshot {
  return {
    version: 1,
    updatedAt: 0,
    profile: { ...defaultProfile },
    prefs: { firstOpenEpochMs: 0, baselineWeightKg: 0, lastWorkoutType: "" },
    fasting: [],
    workouts: [],
    water: [],
    food: [],
    exercise: [],
    schedule: [],
    health: [],
  };
}

export function normalizeSnapshot(raw: Partial<Snapshot> | null | undefined): Snapshot {
  const base = emptySnapshot();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: 1,
    updatedAt: Number(raw.updatedAt) || 0,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    prefs: { ...base.prefs, ...(raw.prefs ?? {}) },
    fasting: Array.isArray(raw.fasting) ? raw.fasting : [],
    workouts: Array.isArray(raw.workouts) ? raw.workouts : [],
    water: Array.isArray(raw.water) ? raw.water : [],
    food: Array.isArray(raw.food) ? raw.food : [],
    exercise: Array.isArray(raw.exercise) ? raw.exercise : [],
    schedule: Array.isArray(raw.schedule) ? raw.schedule : [],
    health: Array.isArray(raw.health) ? raw.health : [],
  };
}

function mergeList<T>(a: T[], b: T[], key: (row: T) => string, pick: (left: T, right: T) => T): T[] {
  const map = new Map<string, T>();
  for (const row of a) {
    const k = key(row);
    if (k) map.set(k, row);
  }
  for (const row of b) {
    const k = key(row);
    if (!k) continue;
    const prev = map.get(k);
    map.set(k, prev ? pick(prev, row) : row);
  }
  return [...map.values()];
}

function reindex<T extends { id: number }>(rows: T[]): T[] {
  return rows.map((row, i) => ({ ...row, id: i + 1 }));
}

function ended<T extends { endEpochMs: number | null }>(left: T, right: T): T {
  if (left.endEpochMs == null && right.endEpochMs != null) return right;
  if (right.endEpochMs == null && left.endEpochMs != null) return left;
  return right;
}

function mergePrefs(a: PrefsBlob, b: PrefsBlob): PrefsBlob {
  const firstA = a.firstOpenEpochMs || 0;
  const firstB = b.firstOpenEpochMs || 0;
  const first =
    firstA > 0 && firstB > 0 ? Math.min(firstA, firstB) : firstA || firstB;
  return {
    firstOpenEpochMs: first,
    baselineWeightKg: a.baselineWeightKg || b.baselineWeightKg,
    lastWorkoutType: b.lastWorkoutType || a.lastWorkoutType || "Walk",
  };
}

function healthKey(row: unknown): string {
  if (row && typeof row === "object" && "dayKey" in row) {
    return String((row as { dayKey: string }).dayKey);
  }
  return JSON.stringify(row);
}

/** Union logs by stable keys; last-write-wins profile via updatedAt. */
export function mergeSnapshots(
  leftRaw: Partial<Snapshot> | null | undefined,
  rightRaw: Partial<Snapshot> | null | undefined,
): Snapshot {
  const leftHasProfile = !!(leftRaw && leftRaw.profile);
  const rightHasProfile = !!(rightRaw && rightRaw.profile);
  const left = normalizeSnapshot(leftRaw);
  const right = normalizeSnapshot(rightRaw);
  const profile: Profile = leftHasProfile && rightHasProfile
    ? (right.updatedAt >= left.updatedAt ? right.profile : left.profile)
    : rightHasProfile
      ? right.profile
      : left.profile;
  return {
    version: 1,
    updatedAt: Math.max(left.updatedAt, right.updatedAt),
    profile,
    prefs: mergePrefs(left.prefs, right.prefs),
    fasting: reindex(
      mergeList<FastingSession>(
        left.fasting,
        right.fasting,
        (s) => String(s.startEpochMs || ""),
        ended,
      ),
    ),
    workouts: reindex(
      mergeList<WorkoutSession>(
        left.workouts,
        right.workouts,
        (s) => String(s.startEpochMs || ""),
        ended,
      ),
    ),
    water: reindex(
      mergeList<WaterLog>(left.water, right.water, (w) => String(w.epochMs || ""), (_a, b) => b),
    ),
    food: reindex(
      mergeList<FoodLog>(
        left.food,
        right.food,
        (f) => `${f.epochMs}|${f.name}`,
        (_a, b) => b,
      ),
    ),
    exercise: reindex(
      mergeList<ExerciseLog>(
        left.exercise,
        right.exercise,
        (e) => `${e.epochMs}|${e.type}|${e.durationMin}`,
        (_a, b) => b,
      ),
    ),
    schedule: reindex(
      mergeList<ScheduleEvent>(
        left.schedule,
        right.schedule,
        (e) => `${e.startEpochMs}|${e.title}`,
        (a, b) => ({
          ...a,
          ...b,
          endEpochMs: Math.max(a.endEpochMs, b.endEpochMs),
          calendarEventId: b.calendarEventId || a.calendarEventId,
          notes: b.notes || a.notes,
          synced: a.synced || b.synced,
        }),
      ),
    ),
    health: mergeList(left.health, right.health, healthKey, (_a, b) => b),
  };
}
