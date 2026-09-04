import { createContext, useContext, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";

interface SearchContextValue {
  search: string;
  setSearch: (value: string) => void;
}

const SearchContext = createContext<SearchContextValue>({
  search: "",
  setSearch: () => undefined,
});

export function useSearch() {
  return useContext(SearchContext);
}

export function AppLayout() {
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <SearchContext.Provider value={value}>
      <div className="flex min-h-screen bg-surface">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SearchContext.Provider>
  );
}
