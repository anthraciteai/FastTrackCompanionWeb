import { useSyncExternalStore } from "react";
import { dayKey, protocolById, workoutKcal } from "./health";
import { defaultProfile } from "./health";
import type {
  ExerciseLog, FastingSession, FoodLog, ScheduleEvent, Snapshot, WaterLog, WorkoutSession,
} from "./types";

const KEY = "fasttrack-snapshot";

function empty(): Snapshot {
  const now = Date.now();
  return {
    version: 1,
    updatedAt: 0,
    profile: defaultProfile(),
    prefs: { firstOpenEpochMs: now, baselineWeightKg: 80, lastWorkoutType: "Walk" },
    fasting: [],
    workouts: [],
    water: [],
    food: [],
    exercise: [],
    schedule: [],
    health: [],
  };
}

function load(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) as Snapshot };
  } catch {
    return empty();
  }
}

let state = load();
const listeners = new Set<() => void>();

function emit(next: Snapshot) {
  state = { ...next, version: 1, updatedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function nid(list: { id: number }[]) {
  return (list.reduce((m, x) => Math.max(m, x.id), 0) || 0) + 1;
}

export function getSnapshot() {
  return state;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function replaceSnapshot(next: Snapshot) {
  state = { ...empty(), ...next, version: 1 };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function patchProfile(partial: Partial<Snapshot["profile"]>) {
  emit({ ...state, profile: { ...state.profile, ...partial } });
}

export function startFast() {
  if (state.fasting.some((f) => f.endEpochMs == null)) return;
  const protocol = protocolById(state.profile.fastingProtocol);
  const session: FastingSession = {
    id: nid(state.fasting),
    startEpochMs: Date.now(),
    endEpochMs: null,
    goalHours: protocol.hours,
    protocol: protocol.id,
    completed: false,
  };
  emit({ ...state, fasting: [...state.fasting, session] });
}

export function endFast() {
  const now = Date.now();
  emit({
    ...state,
    fasting: state.fasting.map((f) => {
      if (f.endEpochMs != null) return f;
      const hours = (now - f.startEpochMs) / 3_600_000;
      return { ...f, endEpochMs: now, completed: hours >= f.goalHours };
    }),
  });
}

export function addWater(amountMl: number) {
  const now = Date.now();
  const row: WaterLog = { id: nid(state.water), epochMs: now, dayKey: dayKey(now), amountMl };
  emit({ ...state, water: [...state.water, row] });
}

export function addFood(input: Omit<FoodLog, "id" | "epochMs" | "dayKey">) {
  const now = Date.now();
  const row: FoodLog = { ...input, id: nid(state.food), epochMs: now, dayKey: dayKey(now) };
  emit({ ...state, food: [...state.food, row] });
}

export function addExercise(input: Omit<ExerciseLog, "id" | "epochMs" | "dayKey" | "source" | "externalId">) {
  const now = Date.now();
  const row: ExerciseLog = {
    ...input,
    id: nid(state.exercise),
    epochMs: now,
    dayKey: dayKey(now),
    source: "MANUAL",
    externalId: null,
  };
  emit({ ...state, exercise: [...state.exercise, row] });
}

export function startWorkout(type: string) {
  if (state.workouts.some((w) => w.endEpochMs == null)) return;
  const now = Date.now();
  const event: ScheduleEvent = {
    id: nid(state.schedule),
    title: type,
    startEpochMs: now,
    endEpochMs: now + 30 * 60_000,
    type: "WORKOUT",
    notes: "In progress",
    calendarEventId: null,
    synced: false,
  };
  const session: WorkoutSession = {
    id: nid(state.workouts),
    startEpochMs: now,
    endEpochMs: null,
    type,
    completed: false,
    scheduleEventId: event.id,
  };
  emit({
    ...state,
    prefs: { ...state.prefs, lastWorkoutType: type },
    schedule: [...state.schedule, event],
    workouts: [...state.workouts, session],
  });
}

export function stopWorkout() {
  const live = state.workouts.find((w) => w.endEpochMs == null);
  if (!live) return;
  const now = Date.now();
  const durationMin = Math.max(1, Math.round((now - live.startEpochMs) / 60_000));
  const calories = workoutKcal(live.type, durationMin, state.profile.weightKg);
  const log: ExerciseLog = {
    id: nid(state.exercise),
    epochMs: live.startEpochMs,
    dayKey: dayKey(live.startEpochMs),
    type: live.type,
    durationMin,
    calories,
    distanceMeters: null,
    avgHeartRate: null,
    source: "MANUAL",
    externalId: null,
  };
  emit({
    ...state,
    workouts: state.workouts.map((w) => w.id === live.id ? { ...w, endEpochMs: now, completed: true } : w),
    exercise: [...state.exercise, log],
    schedule: state.schedule.map((e) =>
      e.id === live.scheduleEventId ? { ...e, endEpochMs: now, notes: `${durationMin} min · ${calories} kcal` } : e
    ),
  });
}

export function addEvent(title: string, type: ScheduleEvent["type"], start: number, end: number) {
  const event: ScheduleEvent = {
    id: nid(state.schedule),
    title,
    startEpochMs: start,
    endEpochMs: end,
    type,
    notes: null,
    calendarEventId: null,
    synced: false,
  };
  emit({ ...state, schedule: [...state.schedule, event] });
}

export function removeById<K extends "water" | "food" | "exercise" | "schedule">(key: K, id: number) {
  emit({ ...state, [key]: state[key].filter((row) => row.id !== id) });
}

export function todayLists(snap: Snapshot) {
  const today = dayKey();
  return {
    water: snap.water.filter((w) => w.dayKey === today),
    food: snap.food.filter((f) => f.dayKey === today),
    exercise: snap.exercise.filter((e) => e.dayKey === today),
  };
}

