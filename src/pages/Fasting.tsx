import { useEffect, useState } from "react";
import { hms, protocolById, PROTOCOLS, stageIndex, STAGES } from "../health";
import { endFast, patchProfile, startFast, useStore } from "../store";

export default function Fasting() {
  const snap = useStore();
  const live = snap.fasting.find((f) => f.endEpochMs == null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = live ? now - live.startEpochMs : 0;
  const hours = elapsed / 3_600_000;
  const remaining = live ? live.goalHours * 3_600_000 - elapsed : 0;
  const stage = STAGES[stageIndex(hours)];
  const protocol = protocolById(snap.profile.fastingProtocol);

  return (
    <>
      <h1>Fasting</h1>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="muted">{live ? (remaining > 0 ? "Remaining" : "Elapsed") : "Goal"}</div>
        <div className="timer accent-fast">
          {live ? hms(remaining > 0 ? remaining : elapsed) : `${protocol.hours}h`}
        </div>
        <p className="muted">{live ? stage.title : protocol.name}</p>
        <button className="btn wide" onClick={() => (live ? endFast() : startFast())}>
          {live ? "End fast" : "Start fast"}
        </button>
      </div>

      {live && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="muted">{stage.bodyState}</div>
          <h2 style={{ marginTop: 4 }}>{stage.title}</h2>
          <p className="muted">{stage.description}</p>
        </div>
      )}

      <h2>Protocol</h2>
      <div className="row">
        {PROTOCOLS.map((p) => (
          <button
            key={p.id}
            className={`chip ${snap.profile.fastingProtocol === p.id ? "on" : ""}`}
            onClick={() => patchProfile({ fastingProtocol: p.id })}
          >
            {p.name}
          </button>
        ))}
      </div>

      <h2>History</h2>
      <div className="list">
        {snap.fasting.slice().reverse().slice(0, 12).map((f) => (
          <div className="item" key={f.id}>
            <div>
              {protocolById(f.protocol).name}
              <div className="muted">{new Date(f.startEpochMs).toLocaleString()}</div>
            </div>
            <div>{f.completed ? "Completed" : f.endEpochMs ? "Ended early" : "Live"}</div>
          </div>
        ))}
        {snap.fasting.length === 0 && <p className="muted">No fasts yet. Start your first window.</p>}
      </div>
    </>
  );
}
