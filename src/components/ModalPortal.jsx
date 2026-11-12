import { createPortal } from "react-dom";

/**
 * Renders modals, drawers, and overlays directly into document.body so that
 * ancestor CSS transforms/animations/overflow-hidden (like .page-enter or
 * .nb-fade-in) never trap `position: fixed` elements out of the viewport.
 */
export default function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
