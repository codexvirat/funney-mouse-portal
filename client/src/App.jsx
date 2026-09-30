import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import TopBar from './components/TopBar';
import Tabs from './components/Tabs';
import PrintArea from './components/PrintArea';
import BillPage from './pages/BillPage';
import TablesPage from './pages/TablesPage';
import DayEndPage from './pages/DayEndPage';
import MembersPage from './pages/MembersPage';
import CustomersPage from './pages/CustomersPage';
import SetupPage from './pages/SetupPage';
import KitchenPage from './pages/KitchenPage';
import CashPage from './pages/CashPage';
import AuditPage from './pages/AuditPage';
import GuestStartSheet from './components/GuestStartSheet';
import PartyPage from './pages/PartyPage';
import BillsPage from './pages/BillsPage';

const STAFF_VIEWS = ['tables', 'bill', 'bills', 'party', 'cash'];

export default function App() {
  const { user, ready, isAdmin } = useAuth();
  const [view, setView] = useState('tables');
  const [billIntent, setBillIntent] = useState(null);
  const [custQuery, setCustQuery] = useState('');
  // "Kaun aaya hai?" popup — shows as soon as the site opens.
  const [guestPopup, setGuestPopup] = useState(true);
  const [focusOrder, setFocusOrder] = useState(null);
  const clearFocus = useCallback(() => setFocusOrder(null), []);

  useEffect(() => {
    document.body.style.paddingBottom = view === 'bill' || view === 'tables' ? '120px' : '40px';
    window.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    if (!isAdmin && !STAFF_VIEWS.includes(view)) setView('tables');
  }, [isAdmin, view]);

  if (!ready) return null;
  if (!user) return <LoginPage />;

  if (user.role === 'kitchen') {
    return (
      <>
        <TopBar />
        <main className="wrap" style={{ paddingTop: 16 }}><KitchenPage /></main>
        <PrintArea />
      </>
    );
  }

  const goView = (v) => {
    if (!isAdmin && !STAFF_VIEWS.includes(v)) return;
    setView(v);
  };

  const startMembership = (phone) => { setBillIntent({ phone, cat: 'member' }); setView('bill'); };
  const billThisCustomer = (cust) => { setBillIntent({ cust }); setView('bill'); };
  const viewCustomer = (phone) => { setCustQuery(phone); setView('cust'); };

  return (
    <>
      <div className="appbar">
        <TopBar />
        <Tabs view={view} setView={goView} />
      </div>
      <main className="wrap">
        {view === 'tables' && <TablesPage focusOrder={focusOrder} onFocused={clearFocus} onNewGuest={() => setGuestPopup(true)} />}
        {view === 'bill' && <BillPage billIntent={billIntent} onConsumeIntent={() => setBillIntent(null)} />}
        {view === 'bills' && <BillsPage />}
        {view === 'party' && <PartyPage />}
        {view === 'cash' && <CashPage />}
        {view === 'day' && isAdmin && <DayEndPage />}
        {view === 'log' && isAdmin && <AuditPage />}
        {view === 'mem' && isAdmin && <MembersPage onStartMembership={startMembership} onViewCustomer={viewCustomer} />}
        {view === 'cust' && isAdmin && <CustomersPage initialQuery={custQuery} onBillThis={billThisCustomer} onMemThis={startMembership} />}
        {view === 'setup' && isAdmin && <SetupPage />}
      </main>
      <GuestStartSheet open={guestPopup} onClose={() => setGuestPopup(false)}
        onMemberOpened={(order) => { setGuestPopup(false); setFocusOrder(order); setView('tables'); }}
        onNonMember={() => { setGuestPopup(false); setView('tables'); }}
        onParty={() => { setGuestPopup(false); setView('party'); }} />
      <PrintArea />
    </>
  );
}
