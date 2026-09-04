import { Bell, CircleHelp, Search } from "lucide-react";
import { useSearch } from "../layouts/AppLayout";

export function Topbar() {
  const { search, setSearch } = useSearch();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="relative mx-auto w-full max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets, customers, or workflows..."
          className="w-full rounded-full border border-slate-200 bg-surface-muted py-2.5 pl-10 pr-4 text-sm outline-none ring-brand-400 placeholder:text-slate-400 focus:ring-2"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Help"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
        <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
          <div className="text-right">
            <p className="text-[11px] font-medium text-slate-400">Support Dashboard</p>
            <p className="text-sm font-semibold text-slate-800">Alex Johnson</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            AJ
          </div>
        </div>
      </div>
    </header>
  );
}
