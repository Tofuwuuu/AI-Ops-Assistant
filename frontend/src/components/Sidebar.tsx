import {
  BarChart3,
  Bot,
  Building2,
  Calendar,
  ChevronsUpDown,
  CreditCard,
  Filter,
  GitBranch,
  Inbox,
  LayoutDashboard,
  Mail,
  Settings,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/inbox", label: "Conversations", icon: Inbox },
  { to: "/calendar", label: "Calendars", icon: Calendar },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/pipeline", label: "Opportunities", icon: Building2 },
  { to: "/invoices", label: "Payments", icon: CreditCard },
];

const NAV_2 = [
  { to: "/campaigns", label: "Marketing", icon: Mail },
  { to: "/workflow", label: "Automation", icon: GitBranch },
  { to: "/funnels", label: "Sites", icon: Filter },
  { to: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { to: "/analytics", label: "Reporting", icon: BarChart3 },
];

const NAV_3 = [
  { to: "/agency", label: "Agency", icon: Building2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function NavGroup({ items }: { items: typeof NAV }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
              isActive
                ? "bg-[#2a2d3a] text-white"
                : "text-slate-400 hover:bg-[#22252f] hover:text-slate-100"
            }`
          }
        >
          {({ isActive }: { isActive: boolean }) => (
            <>
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  isActive ? "bg-emerald-400" : "bg-transparent"
                }`}
              />
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { account } = useAuth();
  const brandName = account?.branding_json?.name || account?.name || "Archivist";
  const primary = account?.branding_json?.primaryColor || "#2563eb";
  const initials = brandName.slice(0, 2).toUpperCase();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-[#15171f] px-3 py-4 text-white">
      <button
        type="button"
        className="mb-4 flex items-center gap-2 rounded-xl border border-white/5 bg-[#1c1f29] px-3 py-2.5 text-left hover:bg-[#22252f]"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: primary }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{brandName}</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {account?.type === "agency" ? "Agency" : "Sub-account"}
          </p>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      </button>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        <NavGroup items={NAV} />
        <div className="mx-3 border-t border-white/5" />
        <NavGroup items={NAV_2} />
        <div className="mx-3 border-t border-white/5" />
        <NavGroup items={NAV_3} />
      </div>

      <p className="mt-auto px-3 text-[10px] text-slate-600">
        {account?.slug ? `${account.slug}.aiops.app` : "AI Ops Assistant"}
      </p>
    </aside>
  );
}
