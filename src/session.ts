export type GoogleSession = {
  token: string;
  email: string;
  name: string;
  sub: string;
  exp: number;
};

const KEY = "fasttrack-google";
const listeners = new Set<() => void>();

function decodeJwt(token: string): { email?: string; name?: string; sub: string; exp: number } {
  const payload = token.split(".")[1] ?? "";
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    Array.from(atob(padded), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
  );
  return JSON.parse(json) as { email?: string; name?: string; sub: string; exp: number };
}

function read(): GoogleSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as GoogleSession;
    if (!session?.token || session.exp * 1000 < Date.now() + 15_000) return null;
    return session;
  } catch {
    return null;
  }
}

let session: GoogleSession | null = read();

export function getSession() {
  return session;
}

export function getIdToken() {
  return session?.token ?? null;
}

export function subscribeSession(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setIdToken(token: string) {
  const payload = decodeJwt(token);
  session = {
    token,
    email: payload.email ?? "",
    name: payload.name ?? "",
    sub: payload.sub,
    exp: payload.exp,
  };
  localStorage.setItem(KEY, JSON.stringify(session));
  listeners.forEach((l) => l());
}

export function clearSession() {
  session = null;
  localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}
