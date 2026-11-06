import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { chatWithOllama, ollamaStatus, type ChatMessage, type OllamaStatus } from "../ollama";

const STARTERS = [
  "How do I start a 16:8 fast?",
  "What should I eat when I break my fast?",
  "Help me plan today’s calories",
  "I feel tired mid-fast — what should I do?",
];

export default function Coach() {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void ollamaStatus().then(setStatus);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, busy]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setDraft("");
    setError("");
    setBusy(true);
    const next: ChatMessage[] = [...history, { role: "user", content: prompt }];
    setHistory([...next, { role: "assistant", content: "" }]);
    try {
      await chatWithOllama(next, (chunk) => {
        setHistory((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: last.content + chunk };
          }
          return copy;
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coach is offline");
      setHistory(next);
    } finally {
      setBusy(false);
      void ollamaStatus().then(setStatus);
      inputRef.current?.focus();
    }
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  }

  return (
    <div className="chat-page">
      <header className="chat-head">
        <div>
          <h1>Coach</h1>
          <p className="muted">{status?.detail ?? "Looking for Ollama…"}</p>
        </div>
        <div className="row">
          {history.length > 0 && (
            <button className="ghost" type="button" onClick={() => { setHistory([]); setError(""); }}>
              New chat
            </button>
          )}
          <Link to="/profile" className="ghost">Profile</Link>
        </div>
      </header>

      <div className="chat-thread">
        {history.length === 0 && (
          <div className="chat-empty">
            <div className="chat-mark">✦</div>
            <h2>How can I help?</h2>
            <p className="muted">Ask about fasting, food, workouts, or your plan. Runs on your machine.</p>
            <div className="chat-starters">
              {STARTERS.map((line) => (
                <button key={line} className="chat-starter" type="button" onClick={() => void send(line)}>
                  {line}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((msg, i) => (
          <div key={`${msg.role}-${i}`} className={`bubble ${msg.role}`}>
            {msg.content || (busy && i === history.length - 1 ? "Coach is thinking…" : "")}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <p className="signin-error">{error}</p>}

      <form
        className="composer chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onComposerKey}
          placeholder={status?.ok ? "Ask anything about FastTrack" : "Start Ollama first"}
          disabled={busy}
        />
        <button className="btn send" type="submit" disabled={busy || !draft.trim()} aria-label="Send">
          Send
        </button>
      </form>
    </div>
  );
}
