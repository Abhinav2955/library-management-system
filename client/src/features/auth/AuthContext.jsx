import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true while we attempt session restore
  const [error, setError] = useState(null);

  // On first load, the browser has no access token in memory (it lives only
  // in JS state, never localStorage) but may still have a valid httpOnly
  // refresh cookie from a previous visit — try to silently restore the
  // session from that before deciding the user is logged out.
  useEffect(() => {
    let cancelled = false;
    authApi
      .silentRefresh()
      .then((restoredUser) => {
        if (!cancelled) setUser(restoredUser);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    setError(null);
    const loggedInUser = await authApi.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (details) => {
    setError(null);
    return authApi.register(details);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = { user, isLoading, error, setError, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};