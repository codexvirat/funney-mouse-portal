import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await api.get('/config');
    setConfig(data.config);
    return data.config;
  }, []);

  useEffect(() => {
    if (!user) { setConfig(null); return; }
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [user, reload]);

  const save = useCallback(async (patch) => {
    const { data } = await api.put('/config', patch);
    setConfig(data.config);
    return data.config;
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, reload, save }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
