import { createPortal } from 'react-dom';

// Rendered as a direct child of <body> (sibling of #root) so the print
// media query's `body>*{display:none}` rule can single it out, exactly
// like the original single-file app's #printarea element.
export default function PrintArea() {
  return createPortal(<div id="printarea"></div>, document.body);
}
