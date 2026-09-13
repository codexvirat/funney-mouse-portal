import axios from 'axios';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ownerApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
});

function applyToken(token) {
  if (token) ownerApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete ownerApi.defaults.headers.common.Authorization;
}

ownerApi.interceptors.response.use(
  res => res,
  err => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('fm_owner_token');
    }
    return Promise.reject(err);
  }
);

const OwnerAuthContext = createContext(null);

// A separate, minimal auth context for the /owner reports portal — its own
// localStorage token key so an owner PIN session never collides with a
// staff/admin login open in the same browser.
export function OwnerAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fm_owner_token') || '');
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('fm_owner_token');
    setToken('');
    setUser(null);
    applyToken('');
  }, []);

  useEffect(() => {
    applyToken(token);
    if (!token) { setUser(null); setReady(true); return; }
    let cancelled = false;
    ownerApi.get('/auth/me')
      .then(({ data }) => { if (!cancelled) setUser(data.user); })
      .catch(() => { if (!cancelled) logout(); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [token, logout]);

  const loginWithPin = useCallback(async (pin) => {
    const { data } = await ownerApi.post('/auth/owner-login', { pin });
    localStorage.setItem('fm_owner_token', data.token);
    applyToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  return (
    <OwnerAuthContext.Provider value={{ user, ready, loginWithPin, logout, api: ownerApi }}>
      {children}
    </OwnerAuthContext.Provider>
  );
}

export const useOwnerAuth = () => useContext(OwnerAuthContext);
