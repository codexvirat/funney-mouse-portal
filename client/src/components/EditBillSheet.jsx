import { useEffect, useState } from 'react';
import api from '../api/client';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { billSubtotal, billDiscount, billTotalWithAuto } from '../utils/bill';
import { uid } from '../utils/uid';
import { INR } from '../utils/money';
import Sheet from './Sheet';
import BillItemsCard from './BillItemsCard';
import FoodPanel from './FoodPanel';
import SocksPanel from './SocksPanel';
import PaymentSheet from './PaymentSheet';

// Lets admin fix a mistake on an already-saved bill (wrong item/qty/discount/
// payment mode) without voiding it. Only Food + Socks items are addable here
// — Play needs a live timer and Membership has cross-bill state — so those
// stay void-and-rebill territory; see billController.editBill on the server.
export default function EditBillSheet({ open, bill, onClose, onSaved }) {
  const { config } = useConfig();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('amt');
  const [cat, setCat] = useState('food');
  const [sockQty, setSockQty] = useState(1);
  const [paySheet, setPaySheet] = useState(false);

  useEffect(() => {
    if (open && bill) {
      setItems(bill.items.map(i => ({ id: uid(), ...i })));
      // The bill only stores the combined discount — back out the manual
      // portion so re-saving without touching it doesn't drop it.
      setDiscount(Math.max(0, (bill.discount || 0) - (bill.memberDiscount || 0) - (bill.happyHourDiscount || 0)));
      setDiscountType('amt');
      setCat('food');
      setPaySheet(false);
    }
  }, [open, bill]);

  if (!open || !bill || !config) return null;

  const hasMembership = bill.items.some(i => i.cat === 'member' || (i.meta && i.meta.member));

  const addItem = (item) => setItems(prev => [...prev, { id: uid(), ...item }]);
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const sub = billSubtotal(items);
  const disc = billDiscount(items, discount, discountType);
  const foodSubtotal = items.filter(i => i.cat === 'food').reduce((a, i) => a + i.amount, 0);
  const cgst = Math.round(foodSubtotal * (Number(config.cgstPercent) || 0) / 100);
  const sgst = Math.round(foodSubtotal * (Number(config.sgstPercent) || 0) / 100);
  const autoDiscount = { memberDiscount: bill.memberDiscount || 0, happyHourDiscount: bill.happyHourDiscount || 0, cgst, sgst };
  const total = billTotalWithAuto(items, discount, discountType, autoDiscount);

  const save = async (pay) => {
    const { data } = await api.patch(`/bills/${bill._id}/edit`, {
      items: items.map(({ id, ...rest }) => rest), discount, discountType, pay
    });
    toast('Bill update ho gaya');
    setPaySheet(false);
    onSaved(data.bill);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Bill #{bill.no} edit karein</h2>
      {hasMembership ? (
        <p className="hint">Ye bill membership plan bechta/use karta hai — is tarah ke bill edit nahi ho sakte, kyunki membership balance corrupt ho sakta hai. Void karke naya bill banayein.</p>
      ) : (
        <>
          <div className="seg" style={{ marginBottom: 14 }}>
            <button aria-pressed={cat === 'food'} onClick={() => setCat('food')}>Food</button>
            <button aria-pressed={cat === 'socks'} onClick={() => setCat('socks')}>Socks</button>
          </div>
          {cat === 'food' && <FoodPanel config={config} items={items} onAdd={addItem} setItems={setItems} />}
          {cat === 'socks' && <SocksPanel config={config} sockQty={sockQty} setSockQty={setSockQty} onAdd={addItem} toast={toast} />}

          <div style={{ marginTop: 14 }}>
            <BillItemsCard items={items} removeItem={removeItem}
              discount={discount} setDiscount={setDiscount}
              discountType={discountType} setDiscountType={setDiscountType}
              canDiscount sub={sub} disc={disc} total={total} autoDiscount={autoDiscount} />
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn primary" style={{ flex: '1 1 100%', padding: 14 }} disabled={!items.length} onClick={() => setPaySheet(true)}>
              Payment split karein · {INR(total)}
            </button>
          </div>

          <PaymentSheet open={paySheet} total={total} onClose={() => setPaySheet(false)} onSave={save} initialPay={bill.pay} />
        </>
      )}
    </Sheet>
  );
}
