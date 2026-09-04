import {
  BarChart3,
  Bot,
  GitBranch,
  Inbox,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { to: "/workflow", label: "Workflow", icon: GitBranch },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-slate-900 px-3 py-5 text-white">
      <div className="mb-8 px-3">
        <p className="text-lg font-bold tracking-tight">Archivist</p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Operational Intelligence
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-600 text-white shadow-soft"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <p className="mt-auto px-3 text-[10px] text-slate-500">v1 · human review required</p>
    </aside>
  );
}
