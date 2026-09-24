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
