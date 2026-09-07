import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEWPORT_GAP = 8;
const TRIGGER_GAP = 6;

export default function ContextMenu({ isOpen, children, onClose, anchorEl }) {
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const closeRef = useRef(onClose);
  const [position, setPosition] = useState(null);

  closeRef.current = onClose;

  const close = () => closeRef.current?.();

  useLayoutEffect(() => {
    if (!isOpen) {
      triggerRef.current = null;
      setPosition(null);
      return undefined;
    }

    const active = document.activeElement;
    const trigger = anchorEl || (active instanceof HTMLElement ? active.closest("button") : null);
    if (!trigger) return undefined;
    triggerRef.current = trigger;

    const frame = requestAnimationFrame(() => {
      if (!triggerRef.current || !menuRef.current) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const roomBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_GAP;
      const roomAbove = triggerRect.top - VIEWPORT_GAP;
      const openAbove = roomBelow < menuRect.height + TRIGGER_GAP && roomAbove >= menuRect.height + TRIGGER_GAP;
      const rawTop = openAbove
        ? triggerRect.top - menuRect.height - TRIGGER_GAP
        : triggerRect.bottom + TRIGGER_GAP;
      const rawLeft = triggerRect.right - menuRect.width;
      setPosition({
        top: Math.max(VIEWPORT_GAP, Math.min(rawTop, window.innerHeight - menuRect.height - VIEWPORT_GAP)),
        left: Math.max(VIEWPORT_GAP, Math.min(rawLeft, window.innerWidth - menuRect.width - VIEWPORT_GAP)),
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen, anchorEl]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      close();
    };
    const onScroll = () => close();

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
      className="z-[9999] w-52 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 text-left shadow-lg"
    >
      {children}
    </div>,
    document.body,
  );
}
