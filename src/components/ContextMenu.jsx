import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEWPORT_GAP = 10;
const TRIGGER_GAP = 6;

export default function ContextMenu({ isOpen, children, onClose }) {
  const menuRef = useRef(null);
  const anchorRef = useRef(null);
  const closeRef = useRef(onClose);
  const [position, setPosition] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const wasOpenRef = useRef(false);

  closeRef.current = onClose;

  if (isOpen && !wasOpenRef.current) {
    wasOpenRef.current = true;
    if (dismissed) setDismissed(false);
  } else if (!isOpen && wasOpenRef.current) {
    wasOpenRef.current = false;
  }

  const visible = isOpen && !dismissed;

  useLayoutEffect(() => {
    if (!visible) {
      anchorRef.current = null;
      setPosition(null);
      return undefined;
    }
    const active = document.activeElement;
    const anchor = active instanceof HTMLElement ? active.closest("button") : null;
    if (!anchor) return undefined;
    anchorRef.current = anchor;
    const frame = requestAnimationFrame(() => {
      if (!anchorRef.current || !menuRef.current) return;
      const a = anchorRef.current.getBoundingClientRect();
      const m = menuRef.current.getBoundingClientRect();
      const left = Math.max(VIEWPORT_GAP, Math.min(a.right - m.width, window.innerWidth - m.width - VIEWPORT_GAP));
      const below = window.innerHeight - a.bottom - VIEWPORT_GAP;
      const above = a.top - VIEWPORT_GAP;
      const openAbove = below < m.height + TRIGGER_GAP && above > below;
      const desiredTop = openAbove ? a.top - m.height - TRIGGER_GAP : a.bottom + TRIGGER_GAP;
      const top = Math.max(VIEWPORT_GAP, Math.min(desiredTop, window.innerHeight - m.height - VIEWPORT_GAP));
      setPosition({ top, left });
    });
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;

    const dismiss = () => {
      setDismissed(true);
      closeRef.current?.();
    };
    const keyDown = (event) => {
      if (event.key === "Escape" || event.key === "Esc" || event.code === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation?.();
        dismiss();
      }
    };
    const pointerDown = (event) => {
      if (menuRef.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      dismiss();
    };

    window.addEventListener("keydown", keyDown, true);
    document.addEventListener("keydown", keyDown, true);
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("scroll", dismiss, true);
    document.addEventListener("wheel", dismiss, true);
    document.addEventListener("touchmove", dismiss, true);

    return () => {
      window.removeEventListener("keydown", keyDown, true);
      document.removeEventListener("keydown", keyDown, true);
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("scroll", dismiss, true);
      document.removeEventListener("wheel", dismiss, true);
      document.removeEventListener("touchmove", dismiss, true);
    };
  }, [visible]);

  if (typeof document === "undefined" || !visible) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: position?.top ?? -10000,
        left: position?.left ?? -10000,
        visibility: position ? "visible" : "hidden",
        transition: "none",
        animation: "none",
        transform: "none",
      }}
      className="z-[9999] w-50 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 text-left shadow-xl !transition-none !duration-0 !animate-none"
    >
      {children}
    </div>,
    document.body,
  );
}
