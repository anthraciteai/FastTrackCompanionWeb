import { useState } from "react";
import { addEvent, removeById, useStore } from "../store";
import type { EventType } from "../types";

export default function Schedule() {
  const snap = useStore();
  const [title, setTitle] = useState("Workout");
  const [type, setType] = useState<EventType>("WORKOUT");
  const upcoming = snap.schedule
    .filter((e) => e.endEpochMs >= Date.now() - 3_600_000)
    .sort((a, b) => a.startEpochMs - b.startEpochMs);

  return (
    <>
      <h1>Schedule</h1>
      <div className="card">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label style={{ marginTop: 8 }}>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value as EventType)}>
          <option>WORKOUT</option><option>FAST</option><option>MEAL</option><option>OTHER</option>
        </select>
        <button className="btn wide" style={{ marginTop: 12 }} onClick={() => {
          const start = Date.now() + 60 * 60_000;
          addEvent(title, type, start, start + 60 * 60_000);
        }}>Add in one hour</button>
      </div>
      <h2>Upcoming</h2>
      <div className="list">
        {upcoming.map((e) => (
          <div className="item" key={e.id}>
            <div>
              {e.title}
              <div className="muted">{e.type} · {new Date(e.startEpochMs).toLocaleString()}</div>
            </div>
            <button className="ghost" onClick={() => removeById("schedule", e.id)}>Remove</button>
          </div>
        ))}
        {upcoming.length === 0 && <p className="muted">Nothing upcoming. Add a workout or meal.</p>}
      </div>
    </>
  );
}
