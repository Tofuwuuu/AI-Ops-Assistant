import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearStoredAuth, getStoredToken, setStoredAuth } from "../api/client";
import { SAMPLE_ME } from "../api/sampleData";
import { DEMO_MODE } from "../lib/demo";
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

// Set on logout so a local session doesn't sign straight back in.
const SKIP_AUTO_SIGN_IN_KEY = "aiops_skip_auto_sign_in";

// One attempt per page load, even when StrictMode runs effects twice.
let autoSignIn: Promise<void> | null = null;
function autoSignInOnce(): Promise<void> {
  autoSignIn ??= api
    .demoSignIn()
    .then(setStoredAuth)
    .catch(() => undefined);
  return autoSignIn;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // The demo build starts signed in as the sample user, so the first paint is
  // the dashboard. It never calls the API.
  const [user, setUser] = useState<AuthUser | null>(DEMO_MODE ? SAMPLE_ME.user : null);
  const [account, setAccount] = useState<Account | null>(DEMO_MODE ? SAMPLE_ME.account : null);
  const [role, setRole] = useState<string | null>(DEMO_MODE ? SAMPLE_ME.role : null);
  const [accounts, setAccounts] = useState<Account[]>(DEMO_MODE ? SAMPLE_ME.accounts : []);
  const [loading, setLoading] = useState(!DEMO_MODE);

  const applySession = useCallback((session: AuthSession) => {
    setStoredAuth(session);
    setUser(session.user);
    setAccount(session.account);
    setRole(session.role);
  }, []);

  const refresh = useCallback(async () => {
    if (DEMO_MODE) return;
    if (!getStoredToken() && !sessionStorage.getItem(SKIP_AUTO_SIGN_IN_KEY)) {
      // Local development: sign in as the seeded demo user. The backend only
      // has /auth/demo when APP_ENV=development; if it fails, show the form.
      await autoSignInOnce();
    }
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
      sessionStorage.removeItem(SKIP_AUTO_SIGN_IN_KEY);
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
    if (DEMO_MODE) return;
    sessionStorage.setItem(SKIP_AUTO_SIGN_IN_KEY, "1");
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
