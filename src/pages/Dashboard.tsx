import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { goalCard, greeting, hms, protocolById, restingBurnedSoFar, targets, waterLabel } from "../health";
import { todayLists, useStore } from "../store";

export default function Dashboard() {
  const snap = useStore();
  const t = targets(snap.profile);
  const today = todayLists(snap);
  const water = today.water.reduce((s, w) => s + w.amountMl, 0);
  const foodKcal = today.food.reduce((s, f) => s + f.calories, 0);
  const exMin = today.exercise.reduce((s, e) => s + e.durationMin, 0);
  const exCal = today.exercise.reduce((s, e) => s + e.calories, 0);
  const fast = snap.fasting.find((f) => f.endEpochMs == null);
  const protocol = protocolById(snap.profile.fastingProtocol);
  const streak = snap.fasting.filter((f) => f.completed).length;
  const projection = goalCard(snap.profile, snap.prefs.firstOpenEpochMs, snap.prefs.baselineWeightKg);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = fast ? now - fast.startEpochMs : 0;
  const remaining = fast ? fast.goalHours * 3_600_000 - elapsed : 0;

  return (
    <>
      <h1>{greeting()}, {snap.profile.displayName}.</h1>
      <p className="muted">Fast smarter. Live lighter.</p>

      <div className="grid" style={{ marginTop: 20 }}>
        <Link to="/fasting" className="card">
          <div className="muted">Fasting</div>
          <div className="metric accent-fast">
            {fast ? hms(remaining > 0 ? remaining : elapsed) : `${protocol.hours}h`}
          </div>
          <div className="muted">{fast ? (remaining > 0 ? "remaining" : "elapsed") : protocol.name}</div>
        </Link>
        <Link to="/log" className="card">
          <div className="muted">Hydration</div>
          <div className="metric accent-water">{waterLabel(water, snap.profile.unitSystem)}</div>
          <div className="progress"><span style={{ width: `${Math.min(100, (water / t.waterMl) * 100)}%` }} /></div>
        </Link>
        <Link to="/log" className="card">
          <div className="muted">Nutrition</div>
          <div className="metric accent-food">{foodKcal}</div>
          <div className="muted">of {t.calories} kcal</div>
        </Link>
        <Link to="/log" className="card">
          <div className="muted">Movement</div>
          <div className="metric accent-move">{exMin}m</div>
          <div className="muted">{exCal} kcal today</div>
        </Link>
      </div>

      <Link to="/coach" className="card" style={{ marginTop: 12, display: "block" }}>
        <div className="muted">Ollama coach</div>
        <h2 style={{ marginTop: 8 }}>Ask what to eat, when to move, or how the fast is going.</h2>
        <p className="muted">Runs on your machine — FastTrack just links the container.</p>
      </Link>

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="muted">Just by breathing</div>
          <div className="metric">{restingBurnedSoFar(t.bmr).toLocaleString()} kcal</div>
          <div className="muted">BMR so far today</div>
        </div>
        <div className="card">
          <div className="muted">{streak} day streak</div>
          <h2 style={{ marginTop: 8 }}>{projection.title}</h2>
          <p className="muted">{projection.body}</p>
        </div>
      </div>
    </>
  );
}
