import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import OwnerApp from './OwnerApp.jsx';
import OrderApp from './OrderApp.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ConfigProvider } from './context/ConfigContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { OwnerAuthProvider } from './context/OwnerAuthContext.jsx';
import './styles/theme.css';

// "/owner" (and "/owner/") serves a separate, PIN-only reports portal —
// its own auth context/token, no access to billing or the staff/admin login.
const isOwnerPortal = window.location.pathname.replace(/\/+$/, '') === '/owner';
// "/order/<tableId>?t=…" is the public QR menu a customer opens from their table.
const isQrOrder = window.location.pathname.startsWith('/order/');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      {isQrOrder ? (
        <OrderApp />
      ) : isOwnerPortal ? (
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
