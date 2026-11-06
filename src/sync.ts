import { mergeSnapshots, normalizeSnapshot } from "./merge";
import { getIdToken } from "./session";
import { getSnapshot, replaceSnapshot, subscribe } from "./store";
import type { Snapshot } from "./types";

let pushTimer: number | undefined;
let pushing = false;
let started = false;
let mute = false;
let lastPushed = "";

function headers(): HeadersInit {
  const token = getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function applyRemote(next: Snapshot) {
  mute = true;
  replaceSnapshot(next);
  lastPushed = JSON.stringify(getSnapshot());
  mute = false;
}

export async function hydrateFromServer(): Promise<string> {
  const token = getIdToken();
  if (!token) return "Sign in with Google first.";
  const res = await fetch("/v1/sync", { headers: headers() });
  if (res.status === 401) throw new Error("Google session expired — sign in again.");
  if (!res.ok) throw new Error(`Couldn't load your FastTrack data (${res.status})`);
  const remote = await res.json();
  const merged = mergeSnapshots(getSnapshot(), remote);
  merged.updatedAt = Date.now();
  applyRemote(merged);
  const put = await fetch("/v1/sync", {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(getSnapshot()),
  });
  if (!put.ok) throw new Error(`Couldn't save your FastTrack data (${put.status})`);
  const saved = await put.json().catch(() => null);
  if (saved?.profile) applyRemote(normalizeSnapshot(saved));
  return "Phone and web are in sync.";
}

export async function pushNow(): Promise<void> {
  const token = getIdToken();
  if (!token || pushing) return;
  const body = JSON.stringify(getSnapshot());
  if (body === lastPushed) return;
  pushing = true;
  try {
    const res = await fetch("/v1/sync", {
      method: "PUT",
      headers: headers(),
      body,
    });
    if (res.status === 401) throw new Error("expired");
    if (!res.ok) return;
    const saved = await res.json().catch(() => null);
    if (saved?.profile) applyRemote(normalizeSnapshot(saved));
    else lastPushed = body;
  } finally {
    pushing = false;
  }
}

export function schedulePush() {
  if (!getIdToken() || mute) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    void pushNow();
  }, 800);
}

export function startSyncLoop() {
  if (started) return;
  started = true;
  subscribe(() => {
    if (mute) return;
    schedulePush();
  });
}

export function stopSyncLoop() {
  window.clearTimeout(pushTimer);
}
