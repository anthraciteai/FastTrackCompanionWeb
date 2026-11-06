import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { emptySnapshot, mergeSnapshots, normalizeSnapshot } from "./src/merge.ts";

function googleClientId(): string {
  const fromEnv = process.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  try {
    const raw = fs.readFileSync(path.resolve("../local.properties"), "utf8");
    const line = raw.split(/\r?\n/).find((row) => row.startsWith("GOOGLE_OAUTH_CLIENT_ID="));
    let value = line?.slice("GOOGLE_OAUTH_CLIENT_ID=".length).trim() ?? "";
    while (value.includes(".apps.googleusercontent.com.apps.googleusercontent.com")) {
      value = value.replace(
        ".apps.googleusercontent.com.apps.googleusercontent.com",
        ".apps.googleusercontent.com",
      );
    }
    return value;
  } catch {
    return "";
  }
}

function userFile(sub: string) {
  return path.resolve("data/users", `${sub}.json`);
}

function readUser(sub: string) {
  const file = userFile(sub);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeUser(sub: string, snapshot: unknown) {
  const file = userFile(sub);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
}

async function verifyGoogle(req: IncomingMessage) {
  const header = req.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const token = match[1];
  const clientId = googleClientId();
  if (!clientId) return null;
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
  );
  if (!response.ok) return null;
  const info = (await response.json()) as { aud?: string; sub?: string; email?: string; exp?: string };
  if (info.aud !== clientId) return null;
  if (Number(info.exp) * 1000 < Date.now()) return null;
  if (!info.sub || !/^[0-9]+$/.test(info.sub)) return null;
  return { sub: info.sub, email: info.email ?? "" };
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function syncApi(): Plugin {
  return {
    name: "fasttrack-sync",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/v1/sync")) {
          next();
          return;
        }
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        void (async () => {
          const user = await verifyGoogle(req);
          if (!user) {
            send(res, 401, { error: "Sign in with Google" });
            return;
          }
          if (req.method === "GET") {
            const stored = readUser(user.sub);
            send(res, 200, stored ?? { version: 1, updatedAt: 0 });
            return;
          }
          if (req.method === "PUT" || req.method === "POST") {
            const raw = await readBody(req);
            const incoming = raw ? JSON.parse(raw) : emptySnapshot();
            const merged = mergeSnapshots(readUser(user.sub), incoming);
            merged.updatedAt = Date.now();
            writeUser(user.sub, normalizeSnapshot(merged));
            send(res, 200, merged);
            return;
          }
          next();
        })().catch((err: unknown) => {
          send(res, 500, { error: err instanceof Error ? err.message : "sync failed" });
        });
      });
    },
  };
}

const clientId = googleClientId();

export default defineConfig({
  plugins: [react(), syncApi()],
  define: {
    "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(clientId),
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/ollama": {
        target: "http://127.0.0.1:11434",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ollama/, ""),
      },
    },
  },
});
