import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Each sheet that opens stacks above the ones already open.
let topZ = 41;

// Rendered straight into <body>: a sheet opened from inside another sheet
// (e.g. Payment inside Edit bill) would otherwise be positioned inside the
// parent's transformed box, and while closed it hangs off the parent's
// bottom — scrolling the parent then shows it on top of the parent's
// content (it was covering the Service charge field).
export default function Sheet({ open, onClose, children, wide }) {
  const [z, setZ] = useState(41);
  useEffect(() => { if (open) setZ(topZ += 2); }, [open]);
  return createPortal(
    <>
      <div className={'scrim' + (open ? ' open' : '')} style={{ zIndex: z - 1 }} onClick={onClose}></div>
      <div className={'sheet' + (open ? ' open' : '')} style={{ zIndex: z }} role="dialog" aria-modal="true" aria-label="Sheet">
        <div className="grab"></div>
        <div className="inner" style={wide ? { maxWidth: 860 } : undefined}>{children}</div>
      </div>
    </>,
    document.body
  );
}
