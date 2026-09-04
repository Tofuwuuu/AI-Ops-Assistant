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
  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <SearchContext.Provider value={value}>
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SearchContext.Provider>
  );
}
