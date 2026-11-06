import { useEffect, useState } from "react";
import { ACTIVITY_TYPES, hms, targets, waterLabel, workoutKcal } from "../health";
import { estimateWithOllama } from "../ollama";
import {
  addExercise, addFood, addWater, removeById, startWorkout, stopWorkout, todayLists, useStore,
} from "../store";
import type { MealType } from "../types";

export default function LogPage() {
  const snap = useStore();
  const t = targets(snap.profile);
  const today = todayLists(snap);
  const live = snap.workouts.find((w) => w.endEpochMs == null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [meal, setMeal] = useState("");
  const [mealType, setMealType] = useState<MealType>("LUNCH");
  const [kcal, setKcal] = useState(0);
  const [p, setP] = useState(0);
  const [c, setC] = useState(0);
  const [f, setF] = useState(0);
  const [exType, setExType] = useState("Walk");
  const [mins, setMins] = useState(30);
  const [exCal, setExCal] = useState(workoutKcal("Walk", 30, snap.profile.weightKg));
  const [estimating, setEstimating] = useState(false);
  const [estimateNote, setEstimateNote] = useState("");

  const water = today.water.reduce((s, w) => s + w.amountMl, 0);

  return (
    <>
      <h1>Log</h1>

      <div className="card">
        <div className="muted">Live workout</div>
        {live ? (
          <>
            <div className="timer accent-move">{hms(now - live.startEpochMs)}</div>
            <p>{live.type}</p>
            <button className="btn wide" onClick={() => stopWorkout()}>Stop workout</button>
          </>
        ) : (
          <>
            <div className="row" style={{ marginTop: 8 }}>
              {ACTIVITY_TYPES.map((type) => (
                <button key={type} className="chip" onClick={() => startWorkout(type)}>{type}</button>
              ))}
            </div>
            <p className="muted">Start activity starts a timer — same as the phone.</p>
          </>
        )}
      </div>

      <h2>Water</h2>
      <div className="card">
        <div className="metric accent-water">{waterLabel(water, snap.profile.unitSystem)}</div>
        <div className="row" style={{ marginTop: 12 }}>
          {[250, 500, 750].map((ml) => (
            <button key={ml} className="btn secondary" onClick={() => addWater(ml)}>
              +{snap.profile.unitSystem === "IMPERIAL" ? `${Math.round(ml / 29.57)} oz` : `${ml} ml`}
            </button>
          ))}
        </div>
        <div className="list" style={{ marginTop: 12 }}>
          {today.water.map((w) => (
            <div className="item" key={w.id}>
              <span>{waterLabel(w.amountMl, snap.profile.unitSystem)}</span>
              <button className="ghost" onClick={() => removeById("water", w.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      <h2>Food</h2>
      <div className="card">
        <label>What did you eat?</label>
        <input value={meal} onChange={(e) => setMeal(e.target.value)} placeholder="chicken, rice, salad" />
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn secondary" disabled={estimating} onClick={() => {
            if (!meal.trim()) return;
            setEstimating(true);
            setEstimateNote("Asking Ollama…");
            void estimateWithOllama(meal).then((est) => {
              setEstimating(false);
              if (!est) {
                setEstimateNote("Couldn't estimate — type the numbers.");
                return;
              }
              setKcal(est.calories); setP(est.proteinG); setC(est.carbsG); setF(est.fatG);
              setEstimateNote(`Estimated with ${est.engine}`);
            }).catch(() => {
              setEstimating(false);
              setEstimateNote("Ollama is offline — start docker compose up -d");
            });
          }}>{estimating ? "Estimating…" : "Estimate with Ollama"}</button>
          <select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            <option>BREAKFAST</option><option>LUNCH</option><option>DINNER</option><option>SNACK</option>
          </select>
        </div>
        <div className="grid" style={{ marginTop: 8 }}>
          <div><label>kcal</label><input type="number" value={kcal} onChange={(e) => setKcal(+e.target.value)} /></div>
          <div><label>protein</label><input type="number" value={p} onChange={(e) => setP(+e.target.value)} /></div>
          <div><label>carbs</label><input type="number" value={c} onChange={(e) => setC(+e.target.value)} /></div>
          <div><label>fat</label><input type="number" value={f} onChange={(e) => setF(+e.target.value)} /></div>
        </div>
        {estimateNote && <p className="muted" style={{ marginTop: 8 }}>{estimateNote}</p>}
        <button className="btn wide" style={{ marginTop: 12 }} onClick={() => {
          if (!meal.trim()) return;
          addFood({ name: meal, mealType, calories: kcal, proteinG: p, carbsG: c, fatG: f });
          setMeal("");
        }}>Save meal</button>
        <p className="muted">Today {today.food.reduce((s, x) => s + x.calories, 0)} / {t.calories} kcal</p>
        <div className="list">
          {today.food.map((food) => (
            <div className="item" key={food.id}>
              <div>{food.name}<div className="muted">{food.mealType}</div></div>
              <div>
                {food.calories} kcal
                <button className="ghost" onClick={() => removeById("food", food.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2>Log a finished workout</h2>
      <div className="card">
        <div className="grid">
          <div>
            <label>Type</label>
            <select value={exType} onChange={(e) => {
              setExType(e.target.value);
              setExCal(workoutKcal(e.target.value, mins, snap.profile.weightKg));
            }}>
              {ACTIVITY_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label>Minutes</label>
            <input type="number" value={mins} onChange={(e) => {
              const v = +e.target.value; setMins(v);
              setExCal(workoutKcal(exType, v, snap.profile.weightKg));
            }} />
          </div>
          <div>
            <label>Calories</label>
            <input type="number" value={exCal} onChange={(e) => setExCal(+e.target.value)} />
          </div>
        </div>
        <button className="btn wide" style={{ marginTop: 12 }} onClick={() => addExercise({
          type: exType, durationMin: mins, calories: exCal, distanceMeters: null, avgHeartRate: null,
        })}>Save workout</button>
        <div className="list" style={{ marginTop: 12 }}>
          {today.exercise.map((e) => (
            <div className="item" key={e.id}>
              <div>{e.type}<div className="muted">{e.durationMin} min</div></div>
              <div>
                {e.calories} kcal
                <button className="ghost" onClick={() => removeById("exercise", e.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
