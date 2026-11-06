export type Sex = "MALE" | "FEMALE" | "OTHER";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
export type WeightGoal = "LOSE" | "MAINTAIN" | "GAIN";
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
export type EventType = "WORKOUT" | "FAST" | "MEAL" | "OTHER";
export type UnitSystem = "IMPERIAL" | "METRIC";

export type Profile = {
  displayName: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  activityLevel: ActivityLevel;
  goal: WeightGoal;
  fastingProtocol: string;
  unitSystem: UnitSystem;
  dietType: string;
  dietaryRestrictions: string;
};

export type FastingSession = {
  id: number;
  startEpochMs: number;
  endEpochMs: number | null;
  goalHours: number;
  protocol: string;
  completed: boolean;
};

export type WorkoutSession = {
  id: number;
  startEpochMs: number;
  endEpochMs: number | null;
  type: string;
  completed: boolean;
  scheduleEventId: number | null;
};

export type WaterLog = { id: number; epochMs: number; dayKey: string; amountMl: number };
export type FoodLog = {
  id: number;
  epochMs: number;
  dayKey: string;
  name: string;
  mealType: MealType;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};
export type ExerciseLog = {
  id: number;
  epochMs: number;
  dayKey: string;
  type: string;
  durationMin: number;
  calories: number;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  source: string;
  externalId: string | null;
};
export type ScheduleEvent = {
  id: number;
  title: string;
  startEpochMs: number;
  endEpochMs: number;
  type: EventType;
  notes: string | null;
  calendarEventId: string | null;
  synced: boolean;
};

export type PrefsBlob = {
  firstOpenEpochMs: number;
  baselineWeightKg: number;
  lastWorkoutType: string;
};

export type Snapshot = {
  version: number;
  updatedAt: number;
  profile: Profile;
  prefs: PrefsBlob;
  fasting: FastingSession[];
  workouts: WorkoutSession[];
  water: WaterLog[];
  food: FoodLog[];
  exercise: ExerciseLog[];
  schedule: ScheduleEvent[];
  health: unknown[];
};
