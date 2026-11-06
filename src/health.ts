import type { ActivityLevel, Profile, UnitSystem, WeightGoal } from "./types";

export const PROTOCOLS = [
  { id: "FOURTEEN_TEN", name: "14:10", hours: 14, blurb: "Beginner friendly" },
  { id: "SIXTEEN_EIGHT", name: "16:8", hours: 16, blurb: "Most popular" },
  { id: "EIGHTEEN_SIX", name: "18:6", hours: 18, blurb: "Intermediate" },
  { id: "TWENTY_FOUR", name: "20:4", hours: 20, blurb: "Warrior" },
  { id: "OMAD", name: "OMAD", hours: 23, blurb: "One meal a day" },
] as const;

export const STAGES = [
  { startHour: 0, title: "Fed State", bodyState: "Anabolic", description: "Digesting your last meal. Insulin is up while nutrients are stored." },
  { startHour: 3, title: "Blood Sugar Settling", bodyState: "Post-absorptive", description: "Insulin falls. Your body starts drawing on glycogen." },
  { startHour: 8, title: "Fat Burning Begins", bodyState: "Catabolic", description: "Glycogen runs low. Stored fat becomes fuel." },
  { startHour: 12, title: "Ketosis Begins", bodyState: "Fat burning", description: "The liver converts fat into ketones for brain and muscle." },
  { startHour: 16, title: "Autophagy Kicks In", bodyState: "Cellular cleanup", description: "Cells recycle damaged parts — a self-cleaning repair mode." },
  { startHour: 18, title: "Deep Ketosis", bodyState: "Peak fat burn", description: "Ketones climb. Many people feel steady energy and focus." },
  { startHour: 24, title: "Growth Hormone & Repair", bodyState: "Autophagy peak", description: "Repair ramps up while lean muscle is protected." },
  { startHour: 48, title: "Immune Reset", bodyState: "Deep repair", description: "Extended fasting only — do this with proper guidance." },
] as const;

export const ACTIVITY_TYPES = [
  "Run", "Walk", "Cycling", "Strength", "Yoga", "Swim", "HIIT", "Hike", "Row",
  "Soccer", "Basketball", "Tennis", "Other",
];

export function protocolById(id: string) {
  return PROTOCOLS.find((p) => p.id === id) ?? PROTOCOLS[1];
}

export function stageIndex(hours: number) {
  let idx = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (hours >= STAGES[i].startHour) idx = i;
    else break;
  }
  return idx;
}

function activityFactor(level: ActivityLevel) {
  return { SEDENTARY: 1.2, LIGHT: 1.375, MODERATE: 1.55, ACTIVE: 1.725, VERY_ACTIVE: 1.9 }[level];
}

export function ageFrom(birthYear: number) {
  return Math.min(100, Math.max(10, new Date().getFullYear() - birthYear));
}

export function bmr(profile: Profile) {
  const age = ageFrom(profile.birthYear);
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  if (profile.sex === "MALE") return base + 5;
  if (profile.sex === "FEMALE") return base - 161;
  return base - 78;
}

export function targets(profile: Profile) {
  const bmrVal = bmr(profile);
  const tdee = bmrVal * activityFactor(profile.activityLevel);
  const calories = Math.max(
    1200,
    profile.goal === "LOSE" ? tdee - 500 : profile.goal === "GAIN" ? tdee + 350 : tdee,
  );
  const waterMl = profile.weightKg * 35 + { SEDENTARY: 0, LIGHT: 250, MODERATE: 500, ACTIVE: 750, VERY_ACTIVE: 1000 }[profile.activityLevel];
  const proteinG = Math.round(profile.weightKg * 1.8);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { calories: Math.round(calories), waterMl, proteinG, carbsG, fatG, bmr: Math.round(bmrVal), tdee: Math.round(tdee) };
}

export function restingBurnedSoFar(bmrKcal: number) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return Math.max(0, Math.round((bmrKcal * minutes) / (24 * 60)));
}

export function met(type: string) {
  const map: Record<string, number> = {
    run: 9.8, walk: 3.5, cycling: 7.5, strength: 6, yoga: 3, swim: 8, hiit: 8,
    hike: 6, row: 7, soccer: 7, basketball: 8, tennis: 7,
  };
  return map[type.trim().toLowerCase()] ?? 5;
}

export function workoutKcal(type: string, durationMin: number, weightKg: number) {
  return Math.max(1, Math.round(met(type) * (weightKg || 80) * (durationMin / 60)));
}

export function hms(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function dayKey(epochMs = Date.now()) {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weightLabel(kg: number, unit: UnitSystem) {
  return unit === "IMPERIAL" ? `${Math.round(kg * 2.20462)} lb` : `${Math.round(kg)} kg`;
}

export function waterLabel(ml: number, unit: UnitSystem) {
  return unit === "IMPERIAL" ? `${(ml / 29.5735).toFixed(1)} oz` : `${Math.round(ml)} ml`;
}

export function distanceLabel(meters: number, unit: UnitSystem) {
  return unit === "IMPERIAL" ? `${(meters / 1609.344).toFixed(2)} mi` : `${(meters / 1000).toFixed(2)} km`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function goalCard(profile: Profile, firstOpenEpochMs: number, baselineWeightKg: number) {
  const days = Math.floor(Math.max(0, Date.now() - (firstOpenEpochMs || Date.now())) / 86_400_000);
  const unit = profile.unitSystem;
  const targetLabel = weightLabel(profile.goalWeightKg, unit);
  if (days < 7) {
    const left = Math.max(1, 7 - days);
    return {
      title: "You're building the habit",
      body: `Day ${Math.max(1, days)}. ${left} more day${left === 1 ? "" : "s"} and we'll sketch when ${targetLabel} could be yours.`,
    };
  }
  const goal: WeightGoal = profile.goal;
  if (goal === "MAINTAIN") {
    return { title: "A week of showing up", body: `Holding around ${weightLabel(profile.weightKg, unit)} is the goal — and you're doing it.` };
  }
  const remaining = goal === "LOSE" ? profile.weightKg - profile.goalWeightKg : profile.goalWeightKg - profile.weightKg;
  if (remaining <= 0.4) return { title: "You're there", body: `You're at ${targetLabel}. That took real work — own it.` };
  const weeks = Math.max(1, days / 7);
  const moved = goal === "LOSE"
    ? Math.max(0, (baselineWeightKg || profile.weightKg) - profile.weightKg)
    : Math.max(0, profile.weightKg - (baselineWeightKg || profile.weightKg));
  const weekly = moved > 0.15 ? moved / weeks : goal === "LOSE" ? 0.5 : 0.25;
  const weeksLeft = Math.min(156, Math.max(1, remaining / Math.max(weekly, 0.15)));
  const eta = new Date(Date.now() + weeksLeft * 7 * 86_400_000);
  const date = eta.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    title: `You could hit ${targetLabel} around ${date}`,
    body: `At about ${weightLabel(weekly, unit)} a week, that's closer than it feels. Keep the streak.`,
  };
}

export const FOOD_TABLE: Record<string, { kcal: number; p: number; c: number; f: number }> = {
  egg: { kcal: 78, p: 6, c: 0.6, f: 5 }, eggs: { kcal: 78, p: 6, c: 0.6, f: 5 },
  toast: { kcal: 90, p: 3, c: 15, f: 1.5 }, chicken: { kcal: 165, p: 31, c: 0, f: 3.6 },
  rice: { kcal: 205, p: 4.3, c: 45, f: 0.4 }, salmon: { kcal: 208, p: 20, c: 0, f: 13 },
  oatmeal: { kcal: 150, p: 5, c: 27, f: 3 }, banana: { kcal: 105, p: 1.3, c: 27, f: 0.4 },
  yogurt: { kcal: 100, p: 10, c: 12, f: 0.5 }, salad: { kcal: 150, p: 3, c: 10, f: 10 },
  avocado: { kcal: 240, p: 3, c: 12, f: 22 }, pasta: { kcal: 220, p: 8, c: 43, f: 1.3 },
  "protein shake": { kcal: 160, p: 30, c: 5, f: 2.5 },
};

export function estimateMeal(description: string) {
  const text = description.toLowerCase().trim();
  if (!text) return null;
  let kcal = 0, p = 0, c = 0, f = 0, matched = false;
  for (const [key, food] of Object.entries(FOOD_TABLE)) {
    if (text.includes(key)) {
      matched = true;
      kcal += food.kcal; p += food.p; c += food.c; f += food.f;
    }
  }
  if (!matched) return null;
  return { calories: Math.round(kcal), proteinG: p, carbsG: c, fatG: f };
}

export function defaultProfile(): Profile {
  return {
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
}
