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
  X,
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

function NavGroup({ items, onNavigate }: { items: typeof NAV; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
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

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { account } = useAuth();
  const brandName = account?.branding_json?.name || account?.name || "Archivist";
  const primary = account?.branding_json?.primaryColor || "#2563eb";
  const initials = brandName.slice(0, 2).toUpperCase();

  const content = (
    <>
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 rounded-xl border border-white/5 bg-[#1c1f29] px-3 py-2.5 text-left hover:bg-[#22252f]"
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
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-[#22252f] hover:text-white md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        <NavGroup items={NAV} onNavigate={onClose} />
        <div className="mx-3 border-t border-white/5" />
        <NavGroup items={NAV_2} onNavigate={onClose} />
        <div className="mx-3 border-t border-white/5" />
        <NavGroup items={NAV_3} onNavigate={onClose} />
      </div>

      <p className="mt-auto px-3 text-[10px] text-slate-600">
        {account?.slug ? `${account.slug}.aiops.app` : "AI Ops Assistant"}
      </p>
    </>
  );

  return (
    <>
      {/* Static sidebar on desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[#15171f] px-3 py-4 text-white md:flex">
        {content}
      </aside>

      {/* Off-canvas drawer on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 max-w-[85vw] flex-col bg-[#15171f] px-3 py-4 text-white transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </aside>
    </>
  );
}
