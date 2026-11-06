import { estimateMeal } from "./health";
import { getSnapshot, todayLists } from "./store";
import type { Snapshot } from "./types";

export const PREFERRED_MODEL = "llama3.2:1b";

export type OllamaStatus = {
  ok: boolean;
  models: string[];
  model: string;
  detail: string;
};

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type MealGuess = {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  engine: string;
};

function pickModel(models: string[]) {
  return models.find((name) => name === PREFERRED_MODEL)
    ?? models.find((name) => name.startsWith("llama3.2"))
    ?? models.find((name) => name.startsWith("gemma"))
    ?? models[0]
    ?? "";
}

export async function ollamaStatus(): Promise<OllamaStatus> {
  try {
    const res = await fetch("/ollama/api/tags");
    if (!res.ok) {
      return { ok: false, models: [], model: "", detail: "Ollama is not answering. Run docker compose up -d" };
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    const models = (data.models ?? []).map((m) => m.name);
    const model = pickModel(models);
    if (!model) {
      return { ok: false, models, model: "", detail: "Runtime is up — pulling llama3.2:1b" };
    }
    return { ok: true, models, model, detail: `Ollama · ${model}` };
  } catch {
    return { ok: false, models: [], model: "", detail: "Start the Ollama container: docker compose up -d" };
  }
}

export function coachContext(snap: Snapshot = getSnapshot()): string {
  const today = todayLists(snap);
  const water = today.water.reduce((sum, row) => sum + row.amountMl, 0);
  const foodKcal = today.food.reduce((sum, row) => sum + row.calories, 0);
  const protein = today.food.reduce((sum, row) => sum + row.proteinG, 0);
  const move = today.exercise.reduce((sum, row) => sum + row.durationMin, 0);
  const liveFast = snap.fasting.find((f) => f.endEpochMs == null);
  const hours = liveFast ? ((Date.now() - liveFast.startEpochMs) / 3_600_000).toFixed(1) : "0";
  const meals = today.food.slice(-6).map((f) => `${f.name} (${f.calories} kcal)`).join(", ") || "none yet";
  return [
    `Name: ${snap.profile.displayName}`,
    `Goal: ${snap.profile.goal} toward ${snap.profile.goalWeightKg} kg from ${snap.profile.weightKg} kg`,
    `Protocol: ${snap.profile.fastingProtocol}, diet ${snap.profile.dietType}`,
    `Today: ${Math.round(water)} ml water, ${foodKcal} kcal, ${Math.round(protein)} g protein, ${move} min movement`,
    `Meals today: ${meals}`,
    liveFast
      ? `Active fast: ${hours}h in, goal ${liveFast.goalHours}h (${liveFast.protocol})`
      : "No active fast",
  ].join("\n");
}

export async function estimateWithOllama(description: string): Promise<MealGuess | null> {
  const status = await ollamaStatus();
  if (!status.ok) {
    const fallback = estimateMeal(description);
    return fallback ? { ...fallback, name: description.trim(), engine: "heuristic" } : null;
  }
  const res = await fetch("/ollama/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: status.model,
      stream: false,
      format: "json",
      prompt: `Estimate this meal. Reply with JSON only: {"name":string,"calories":int,"protein_g":number,"carbs_g":number,"fat_g":number}\nMeal: ${description}`,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { response?: string };
  const raw = data.response ?? "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const json = JSON.parse(raw.slice(start, end + 1)) as {
    name?: string; calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number;
  };
  if (typeof json.calories !== "number") return null;
  return {
    name: json.name || description.trim(),
    calories: Math.round(json.calories),
    proteinG: Number(json.protein_g) || 0,
    carbsG: Number(json.carbs_g) || 0,
    fatG: Number(json.fat_g) || 0,
    engine: `Ollama · ${status.model}`,
  };
}

export async function chatWithOllama(
  history: ChatMessage[],
  onDelta: (chunk: string) => void,
): Promise<void> {
  const status = await ollamaStatus();
  if (!status.ok) throw new Error(status.detail);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are FastTrack Coach, a helpful assistant for this fasting and fitness app. " +
        "Answer questions about how to use FastTrack, fasting, food, workouts, and the user's plan. " +
        "Short, practical, encouraging. Never medical advice. Use the athlete snapshot. Prefer one next action.\n\n" +
        coachContext(),
    },
    ...history,
  ];
  const res = await fetch("/ollama/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: status.model, stream: true, messages }),
  });
  if (!res.ok || !res.body) throw new Error("Ollama chat failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line) as { message?: { content?: string } };
        if (json.message?.content) onDelta(json.message.content);
      } catch {
        // ignore partial JSON
      }
    }
  }
}
