import { Bell, CalendarDays, ChevronDown, CircleHelp, LogOut, MessageCircle, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSearch } from "../layouts/AppLayout";

export function Topbar() {
  const { search, setSearch } = useSearch();
  const { user, account, logout } = useAuth();
  const initials = (user?.display_name || user?.email || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-2.5 sm:px-6">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Dashboard
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      <div className="relative hidden max-w-xs flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets, customers, or workflows..."
          className="w-full rounded-full border border-slate-200 bg-surface-muted py-2 pl-10 pr-4 text-sm outline-none ring-brand-400 placeholder:text-slate-400 focus:ring-2"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
        <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 md:inline-flex">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          {fmt(monthAgo)} – {fmt(today)}
        </span>

        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
          aria-label="Messages"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200"
          aria-label="Help"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={logout}
          className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
        </button>
        <div className="hidden items-center gap-2 border-l border-slate-200 pl-2.5 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="hidden lg:block">
            <p className="text-[11px] font-medium leading-tight text-slate-400">{account?.name || "Workspace"}</p>
            <p className="text-sm font-semibold leading-tight text-slate-800">
              {user?.display_name || user?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
