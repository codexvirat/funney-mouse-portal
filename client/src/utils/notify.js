// Opens WhatsApp with a ready-to-send message for an Indian mobile number.
export function openWhatsApp(phone, text) {
  const num = String(phone || '').replace(/\D/g, '').slice(-10);
  window.open(`https://wa.me/${num ? '91' + num : ''}?text=${encodeURIComponent(text)}`, '_blank');
}

// Short beep for alerts (play time up, food ready, new QR order). Browsers
// only allow audio after the user has tapped the page once.
export function beep(freq = 880, ms = 250) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  } catch (e) { /* no audio available */ }
}

// Play timer state against the slab the kid paid for. 'warn' in the last
// 5 minutes, 'over' once time has run out.
export function playAlert(start, plannedMins) {
  if (!start || !plannedMins) return null;
  const mins = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 60000));
  const left = plannedMins - mins;
  if (left <= 0) return { state: 'over', text: `Time over +${-left} min` };
  if (left <= 5) return { state: 'warn', text: `${left} min baaki` };
  return { state: 'ok', text: `${left} min baaki` };
}

// Service worker used only to show notifications (see public/sw.js).
export function registerNotifyWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register('/sw.js').catch(() => null);
}

// Phone/desktop system notification (plus vibration). Only works after the
// user has allowed notifications — see askNotifyPermission. Goes through the
// service worker when there is one, since Android Chrome refuses
// `new Notification()`.
export function systemNotify(title, body, tag) {
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const opts = { body, tag, renotify: true, vibrate: [200, 100, 200] };
  const viaPage = () => { try { new Notification(title, opts); } catch (e) { /* not allowed here */ } };
  if (!('serviceWorker' in navigator)) { viaPage(); return; }
  navigator.serviceWorker.getRegistration()
    .then(reg => (reg ? reg.showNotification(title, opts) : viaPage()))
    .catch(viaPage);
}

export function notifyPermission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export async function askNotifyPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  await registerNotifyWorker();
  return Notification.requestPermission();
}
