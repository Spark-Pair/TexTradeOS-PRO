import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef } from "react";

const MENU_OPEN_EVENT = "textradeos:context-menu-open";

export default function ContextMenu({ isOpen, children, onClose }) {
  const menuId = useId();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    window.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT, { detail: menuId }));
    const closeOther = (event) => { if (event.detail !== menuId) onClose?.(); };
    const closeOutside = (event) => { if (!rootRef.current?.contains(event.target)) onClose?.(); };
    const closeEscape = (event) => { if (event.key === "Escape") onClose?.(); };
    const closeOnScroll = () => onClose?.();
    window.addEventListener(MENU_OPEN_EVENT, closeOther);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      window.removeEventListener(MENU_OPEN_EVENT, closeOther);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [isOpen, menuId, onClose]);

  return (
    <AnimatePresence>
      {isOpen && <motion.div ref={rootRef} initial={{ opacity: 0, scale: 0.96, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -6 }} transition={{ duration: 0.12 }} onClick={(e) => e.stopPropagation()} className="absolute right-7 top-14 z-[50] w-50 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 text-left shadow-xl">{children}</motion.div>}
    </AnimatePresence>
  );
}
