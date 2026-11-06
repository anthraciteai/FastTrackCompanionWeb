import { useState } from "react";
import { useGoogleUser } from "../auth";
import { targets, weightLabel } from "../health";
import { patchProfile, useStore } from "../store";
import { hydrateFromServer } from "../sync";
import type { ActivityLevel, Sex, UnitSystem, WeightGoal } from "../types";

export default function Profile() {
  const snap = useStore();
  const user = useGoogleUser();
  const p = snap.profile;
  const t = targets(p);
  const [status, setStatus] = useState("");

  async function syncNow() {
    setStatus("Syncing…");
    try {
      setStatus(await hydrateFromServer());
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Sync failed.");
    }
  }

  return (
    <>
      <h1>Profile</h1>
      <div className="card">
        <label>Name</label>
        <input value={p.displayName} onChange={(e) => patchProfile({ displayName: e.target.value })} />
        <div className="grid" style={{ marginTop: 12 }}>
          <div>
            <label>Units</label>
            <select value={p.unitSystem} onChange={(e) => patchProfile({ unitSystem: e.target.value as UnitSystem })}>
              <option value="IMPERIAL">Imperial</option>
              <option value="METRIC">Metric</option>
            </select>
          </div>
          <div>
            <label>Sex</label>
            <select value={p.sex} onChange={(e) => patchProfile({ sex: e.target.value as Sex })}>
              <option>MALE</option><option>FEMALE</option><option>OTHER</option>
            </select>
          </div>
          <div>
            <label>Birth year</label>
            <input type="number" value={p.birthYear} onChange={(e) => patchProfile({ birthYear: +e.target.value })} />
          </div>
          <div>
            <label>Height (cm)</label>
            <input type="number" value={p.heightCm} onChange={(e) => patchProfile({ heightCm: +e.target.value })} />
          </div>
          <div>
            <label>Weight ({p.unitSystem === "IMPERIAL" ? "lb stored as kg" : "kg"})</label>
            <input type="number" value={p.weightKg} onChange={(e) => patchProfile({ weightKg: +e.target.value })} />
          </div>
          <div>
            <label>Goal weight (kg)</label>
            <input type="number" value={p.goalWeightKg} onChange={(e) => patchProfile({ goalWeightKg: +e.target.value })} />
          </div>
          <div>
            <label>Activity</label>
            <select value={p.activityLevel} onChange={(e) => patchProfile({ activityLevel: e.target.value as ActivityLevel })}>
              <option>SEDENTARY</option><option>LIGHT</option><option>MODERATE</option><option>ACTIVE</option><option>VERY_ACTIVE</option>
            </select>
          </div>
          <div>
            <label>Goal</label>
            <select value={p.goal} onChange={(e) => patchProfile({ goal: e.target.value as WeightGoal })}>
              <option>LOSE</option><option>MAINTAIN</option><option>GAIN</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="muted">Daily energy</div>
          <div className="metric">{t.calories}</div>
          <p className="muted">BMR {t.bmr} · TDEE {t.tdee} · {t.proteinG}p / {t.carbsG}c / {t.fatG}f</p>
        </div>
        <div className="card">
          <div className="muted">Goal</div>
          <div className="metric">{weightLabel(p.goalWeightKg, p.unitSystem)}</div>
          <p className="muted">Water target {Math.round(t.waterMl)} ml</p>
        </div>
      </div>

      <h2>Google sync</h2>
      <div className="card">
        <p className="muted">
          Signed in as {user?.email}. The same Google account on your phone (Profile → Connections →
          FastTrack Web) shares this snapshot — fasting, logs, workouts, and profile.
        </p>
        <div className="row">
          <button className="btn" onClick={() => void syncNow()}>Sync now</button>
        </div>
        {status && <p className="muted" style={{ marginTop: 12 }}>{status}</p>}
      </div>
    </>
  );
}
