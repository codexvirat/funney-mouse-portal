import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { setAuthToken, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fm_token') || '');
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('fm_token');
    setToken('');
    setUser(null);
    setAuthToken('');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    setAuthToken(token);
    if (!token) { setUser(null); setReady(true); return; }
    let cancelled = false;
    api.get('/auth/me')
      .then(({ data }) => { if (!cancelled) setUser(data.user); })
      .catch(() => { if (!cancelled) logout(); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [token, logout]);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('fm_token', data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = { user, token, ready, login, logout, isAdmin: !!user && user.role === 'admin' };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
