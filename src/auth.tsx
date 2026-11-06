import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { clearSession, getSession, setIdToken, subscribeSession } from "./session";
import { hydrateFromServer, startSyncLoop, stopSyncLoop } from "./sync";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-gis]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Couldn't load Google Sign-In")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.gis = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load Google Sign-In"));
    document.head.appendChild(script);
  });
}

export function useGoogleUser() {
  return useSyncExternalStore(subscribeSession, getSession, getSession);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const user = useGoogleUser();
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!user) {
      stopSyncLoop();
      return;
    }
    startSyncLoop();
    setSyncing(true);
    void hydrateFromServer()
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Couldn't sync";
        if (message.toLowerCase().includes("expired")) clearSession();
        setError(message);
      })
      .finally(() => setSyncing(false));
  }, [user?.sub]);

  if (!user) {
    return <SignInScreen error={error} onError={setError} />;
  }

  return (
    <>
      {syncing && <div className="sync-banner">Syncing with your Google account…</div>}
      {error && !syncing && <div className="sync-banner">{error}</div>}
      {children}
    </>
  );
}

function SignInScreen({ error, onError }: { error: string; onError: (msg: string) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!CLIENT_ID) {
        onError("Missing Google client ID. Set GOOGLE_OAUTH_CLIENT_ID in local.properties.");
        return;
      }
      try {
        await loadGis();
        if (cancelled || !buttonRef.current) return;
        window.google!.accounts.id.initialize({
          client_id: CLIENT_ID,
          auto_select: true,
          ux_mode: "popup",
          callback: (response) => {
            try {
              setIdToken(response.credential);
              onError("");
            } catch (err) {
              onError(err instanceof Error ? err.message : "Couldn't read Google sign-in");
            }
          },
        });
        buttonRef.current.innerHTML = "";
        window.google!.accounts.id.renderButton(buttonRef.current, {
          theme: "filled_black",
          size: "large",
          text: "signin_with",
          shape: "pill",
          width: 280,
        });
        window.google!.accounts.id.prompt();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Couldn't start Google Sign-In");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  return (
    <div className="signin">
      <div className="signin-card">
        <div className="brand">FastTrack</div>
        <h1>Sign in with Google</h1>
        <p className="muted">
          Same Google account on your phone and this browser. Fasting, food, workouts, and your
          profile stay in sync.
        </p>
        <div ref={buttonRef} className="google-btn" />
        {error && <p className="signin-error">{error}</p>}
        <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
          In Google Cloud, add <code>http://localhost:5173</code> as an authorized JavaScript origin
          on the Web OAuth client.
        </p>
      </div>
    </div>
  );
}

export function AccountChip() {
  const user = useGoogleUser();
  if (!user) return null;
  return (
    <div className="account">
      <span className="muted">{user.email}</span>
      <button
        className="ghost"
        type="button"
        onClick={() => {
          window.google?.accounts.id.disableAutoSelect();
          if (user.email) window.google?.accounts.id.revoke(user.email);
          clearSession();
        }}
      >
        Sign out
      </button>
    </div>
  );
}
