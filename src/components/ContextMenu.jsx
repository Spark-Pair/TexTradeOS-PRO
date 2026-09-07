import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_OPEN_EVENT = "textradeos:context-menu-open";
const VIEWPORT_GAP = 10;
const TRIGGER_GAP = 6;

export default function ContextMenu({ isOpen, children, onClose }) {
  const menuId = useId();
  const menuRef = useRef(null);
  const anchorRef = useRef(null);
  const [position, setPosition] = useState(null);

  const measure = useCallback(() => {
    const menu = menuRef.current;
    const anchor = anchorRef.current;
    if (!menu || !anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const width = menuRect.width;
    const height = menuRect.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = anchorRect.right - width;
    left = Math.max(VIEWPORT_GAP, Math.min(left, viewportWidth - width - VIEWPORT_GAP));

    const spaceBelow = viewportHeight - anchorRect.bottom - VIEWPORT_GAP;
    const spaceAbove = anchorRect.top - VIEWPORT_GAP;
    const openAbove = spaceBelow < height + TRIGGER_GAP && spaceAbove > spaceBelow;
    let top = openAbove ? anchorRect.top - height - TRIGGER_GAP : anchorRect.bottom + TRIGGER_GAP;
    top = Math.max(VIEWPORT_GAP, Math.min(top, viewportHeight - height - VIEWPORT_GAP));

    setPosition({ top, left, origin: openAbove ? "bottom right" : "top right" });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    const active = document.activeElement;
    const button = active?.closest?.("button");
    anchorRef.current = button || null;
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [isOpen, measure]);

  useEffect(() => {
    if (!isOpen) return undefined;
    window.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT, { detail: menuId }));
    const closeOther = (event) => { if (event.detail !== menuId) onClose?.(); };
    const closeOutside = (event) => {
      if (menuRef.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      onClose?.();
    };
    const closeEscape = (event) => { if (event.key === "Escape") onClose?.(); };
    const closeOnScroll = () => onClose?.();
    const reposition = () => measure();
    window.addEventListener(MENU_OPEN_EVENT, closeOther);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener(MENU_OPEN_EVENT, closeOther);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, menuId, measure, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          role="menu"
          initial={{ opacity: 0, scale: 0.97, y: position?.origin?.startsWith("bottom") ? 4 : -4 }}
          animate={{ opacity: position ? 1 : 0, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.12 }}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "fixed",
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            transformOrigin: position?.origin || "top right",
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
