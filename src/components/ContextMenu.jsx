import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_OPEN_EVENT = "textradeos:context-menu-open";
const VIEWPORT_GAP = 10;
const TRIGGER_GAP = 6;

export default function ContextMenu({ isOpen, children, onClose }) {
  const menuId = useId();
  const menuRef = useRef(null);
  const anchorRef = useRef(null);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      anchorRef.current = null;
      setPosition(null);
      return undefined;
    }

    const active = document.activeElement;
    const anchor = active instanceof HTMLElement ? active.closest("button") : null;
    if (!anchor) {
      onClose?.();
      return undefined;
    }
    anchorRef.current = anchor;

    const place = () => {
      const menu = menuRef.current;
      if (!menu || !anchorRef.current) return;
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const width = menuRect.width;
      const height = menuRect.height;
      const maxLeft = Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP);
      const left = Math.max(VIEWPORT_GAP, Math.min(anchorRect.right - width, maxLeft));
      const spaceBelow = window.innerHeight - anchorRect.bottom - VIEWPORT_GAP;
      const spaceAbove = anchorRect.top - VIEWPORT_GAP;
      const openAbove = spaceBelow < height + TRIGGER_GAP && spaceAbove >= height + TRIGGER_GAP;
      const preferredTop = openAbove ? anchorRect.top - height - TRIGGER_GAP : anchorRect.bottom + TRIGGER_GAP;
      const maxTop = Math.max(VIEWPORT_GAP, window.innerHeight - height - VIEWPORT_GAP);
      const top = Math.max(VIEWPORT_GAP, Math.min(preferredTop, maxTop));
      setPosition({ top, left, openAbove });
    };

    const frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [isOpen, children, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    window.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT, { detail: menuId }));

    const close = () => onClose?.();
    const closeOther = (event) => { if (event.detail !== menuId) close(); };
    const closeOutside = (event) => {
      if (menuRef.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      close();
    };
    const closeEscape = (event) => { if (event.key === "Escape") close(); };

    window.addEventListener(MENU_OPEN_EVENT, closeOther);
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("keydown", closeEscape, true);
    document.addEventListener("scroll", close, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("wheel", close, { capture: true, passive: true });
    window.addEventListener("touchmove", close, { capture: true, passive: true });
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener(MENU_OPEN_EVENT, closeOther);
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("keydown", closeEscape, true);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("wheel", close, true);
      window.removeEventListener("touchmove", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen, menuId, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          role="menu"
          initial={false}
          animate={{ opacity: position ? 1 : 0, scale: position ? 1 : 0.98 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.1 }}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "fixed",
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            transformOrigin: position?.openAbove ? "bottom right" : "top right",
            visibility: position ? "visible" : "hidden",
          }}
          className="z-[9999] w-50 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 text-left shadow-xl"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
