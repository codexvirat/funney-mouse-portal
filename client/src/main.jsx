import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import OwnerApp from './OwnerApp.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ConfigProvider } from './context/ConfigContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { OwnerAuthProvider } from './context/OwnerAuthContext.jsx';
import './styles/theme.css';

// "/owner" (and "/owner/") serves a separate, PIN-only reports portal —
// its own auth context/token, no access to billing or the staff/admin login.
const isOwnerPortal = window.location.pathname.replace(/\/+$/, '') === '/owner';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      {isOwnerPortal ? (
        <OwnerAuthProvider>
          <OwnerApp />
        </OwnerAuthProvider>
      ) : (
        <AuthProvider>
          <ConfigProvider>
            <App />
          </ConfigProvider>
        </AuthProvider>
      )}
    </ToastProvider>
  </React.StrictMode>
);
