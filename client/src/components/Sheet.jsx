export default function Sheet({ open, onClose, children, wide }) {
  return (
    <>
      <div className={'scrim' + (open ? ' open' : '')} onClick={onClose}></div>
      <div className={'sheet' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-label="Sheet">
        <div className="grab"></div>
        <div className="inner" style={wide ? { maxWidth: 860 } : undefined}>{children}</div>
      </div>
    </>
  );
}
