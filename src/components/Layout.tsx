import { NavLink, Outlet } from "react-router-dom";
import { AccountChip } from "../auth";

const links = [
  { to: "/", label: "Home" },
  { to: "/fasting", label: "Fasting" },
  { to: "/log", label: "Log" },
  { to: "/schedule", label: "Schedule" },
  { to: "/coach", label: "Coach" },
];

export default function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">FastTrack</div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="account">
          <NavLink to="/profile" className={({ isActive }) => (isActive ? "active" : "")}>Profile</NavLink>
          <AccountChip />
        </div>
      </header>
      <Outlet />
    </div>
  );
}
