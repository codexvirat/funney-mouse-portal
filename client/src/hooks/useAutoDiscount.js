import { useEffect, useState } from 'react';
import api from '../api/client';

const ZERO = { memberDiscount: 0, happyHourDiscount: 0, pointsDiscount: 0, cgst: 0, sgst: 0 };

// Server-side membership %/happy-hour discounts depend on the customer and
// current time, not just local state — this previews them (debounced) so
// what's shown before payment matches what checkout will actually charge.
export function useAutoDiscount(phone, items, { discount = 0, discountType = 'amt', redeemPoints = 0 } = {}) {
  const [autoDiscount, setAutoDiscount] = useState(ZERO);

  useEffect(() => {
    if (!items.length) { setAutoDiscount(ZERO); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.post('/bills/preview', {
          phone: phone || '',
          items: items.map(({ id, ...rest }) => rest),
          discount, discountType, redeemPoints
        });
        if (!cancelled) setAutoDiscount({
          memberDiscount: data.memberDiscount || 0, happyHourDiscount: data.happyHourDiscount || 0,
          pointsDiscount: data.pointsDiscount || 0,
          cgst: data.cgst || 0, sgst: data.sgst || 0
        });
      } catch (e) { /* ignore transient preview errors */ }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [phone, items, discount, discountType, redeemPoints]);

  return autoDiscount;
}
