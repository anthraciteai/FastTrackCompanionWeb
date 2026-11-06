import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthGate } from "./auth";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Fasting from "./pages/Fasting";
import LogPage from "./pages/Log";
import Coach from "./pages/Coach";
import Profile from "./pages/Profile";
import Schedule from "./pages/Schedule";

export default function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/fasting" element={<Fasting />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/coach" element={<Coach />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthGate>
  );
}
