import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import TopBar from './components/TopBar';
import Tabs from './components/Tabs';
import PrintArea from './components/PrintArea';
import BillPage from './pages/BillPage';
import DayEndPage from './pages/DayEndPage';
import MembersPage from './pages/MembersPage';
import CustomersPage from './pages/CustomersPage';
import SetupPage from './pages/SetupPage';

export default function App() {
  const { user, ready, isAdmin } = useAuth();
  const [view, setView] = useState('bill');
  const [billIntent, setBillIntent] = useState(null);
  const [custQuery, setCustQuery] = useState('');

  useEffect(() => {
    document.body.style.paddingBottom = view === 'bill' ? '120px' : '40px';
    window.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    if (!isAdmin && view !== 'bill') setView('bill');
  }, [isAdmin, view]);

  if (!ready) return null;
  if (!user) return <LoginPage />;

  const goView = (v) => {
    if (v !== 'bill' && !isAdmin) return;
    setView(v);
  };

  const startMembership = (phone) => { setBillIntent({ phone, cat: 'member' }); setView('bill'); };
  const billThisCustomer = (cust) => { setBillIntent({ cust }); setView('bill'); };
  const viewCustomer = (phone) => { setCustQuery(phone); setView('cust'); };

  return (
    <>
      <TopBar />
      <Tabs view={view} setView={goView} />
      <main className="wrap">
        {view === 'bill' && <BillPage billIntent={billIntent} onConsumeIntent={() => setBillIntent(null)} />}
        {view === 'day' && isAdmin && <DayEndPage />}
        {view === 'mem' && isAdmin && <MembersPage onStartMembership={startMembership} onViewCustomer={viewCustomer} />}
        {view === 'cust' && isAdmin && <CustomersPage initialQuery={custQuery} onBillThis={billThisCustomer} onMemThis={startMembership} />}
        {view === 'setup' && isAdmin && <SetupPage />}
      </main>
      <PrintArea />
    </>
  );
}
