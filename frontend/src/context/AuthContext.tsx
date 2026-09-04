import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearStoredAuth, getStoredToken, setStoredAuth } from "../api/client";
import type { Account, AuthSession, AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  account: Account | null;
  role: string | null;
  accounts: Account[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: {
    email: string;
    password: string;
    account_name: string;
    display_name?: string;
  }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session: AuthSession) => {
    setStoredAuth(session);
    setUser(session.user);
    setAccount(session.account);
    setRole(session.role);
  }, []);

  const refresh = useCallback(async () => {
    if (!getStoredToken()) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me.user);
      setAccount(me.account);
      setRole(me.role);
      setAccounts(me.accounts);
    } catch {
      clearStoredAuth();
      setUser(null);
      setAccount(null);
      setRole(null);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await api.login({ email, password });
      applySession(session);
      await refresh();
    },
    [applySession, refresh]
  );

  const signup = useCallback(
    async (payload: {
      email: string;
      password: string;
      account_name: string;
      display_name?: string;
    }) => {
      const session = await api.signup(payload);
      applySession(session);
      await refresh();
    },
    [applySession, refresh]
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setAccount(null);
    setRole(null);
    setAccounts([]);
    window.location.href = "/login";
  }, []);

  const switchAccount = useCallback(
    async (accountId: string) => {
      const session = await api.switchAccount(accountId);
      applySession(session);
      await refresh();
    },
    [applySession, refresh]
  );

  const value = useMemo(
    () => ({
      user,
      account,
      role,
      accounts,
      loading,
      login,
      signup,
      logout,
      refresh,
      switchAccount,
    }),
    [user, account, role, accounts, loading, login, signup, logout, refresh, switchAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
