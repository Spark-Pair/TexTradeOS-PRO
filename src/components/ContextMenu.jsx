import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_OPEN_EVENT = "textradeos:context-menu-open";
const VIEWPORT_GAP = 10;
const TRIGGER_GAP = 6;

export default function ContextMenu({ isOpen, children, onClose }) {
  const menuId = useId();
  const menuRef = useRef(null);
  const anchorRef = useRef(null);
  const closeRef = useRef(onClose);
  const [position, setPosition] = useState(null);

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useLayoutEffect(() => {
    if (!isOpen) {
      anchorRef.current = null;
      setPosition(null);
      return undefined;
    }

    const active = document.activeElement;
    const anchor = active instanceof HTMLElement ? active.closest("button") : null;
    if (!anchor) {
      closeRef.current?.();
      return undefined;
    }
    anchorRef.current = anchor;

    let cancelled = false;
    const place = () => {
      if (cancelled || !anchorRef.current || !menuRef.current) return;
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const width = menuRect.width;
      const height = menuRect.height;
      const left = Math.max(VIEWPORT_GAP, Math.min(anchorRect.right - width, window.innerWidth - width - VIEWPORT_GAP));
      const below = window.innerHeight - anchorRect.bottom - VIEWPORT_GAP;
      const above = anchorRect.top - VIEWPORT_GAP;
      const openAbove = below < height + TRIGGER_GAP && above > below;
      const desiredTop = openAbove ? anchorRect.top - height - TRIGGER_GAP : anchorRect.bottom + TRIGGER_GAP;
      const top = Math.max(VIEWPORT_GAP, Math.min(desiredTop, window.innerHeight - height - VIEWPORT_GAP));
      setPosition({ top, left });
    };

    const frame = requestAnimationFrame(place);
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    window.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT, { detail: menuId }));
    const close = () => closeRef.current?.();
    const closeOther = (event) => { if (event.detail !== menuId) close(); };
    const pointerDown = (event) => {
      if (menuRef.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      close();
    };
    const keyDown = (event) => { if (event.key === "Escape") close(); };

    window.addEventListener(MENU_OPEN_EVENT, closeOther);
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("mousedown", pointerDown, true);
    document.addEventListener("keydown", keyDown, true);
    document.addEventListener("scroll", close, true);
    window.addEventListener("scroll", close, true);
    document.addEventListener("wheel", close, true);
    document.addEventListener("touchmove", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener(MENU_OPEN_EVENT, closeOther);
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("mousedown", pointerDown, true);
      document.removeEventListener("keydown", keyDown, true);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("wheel", close, true);
      document.removeEventListener("touchmove", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen, menuId]);

  if (typeof document === "undefined" || !isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        top: position?.top ?? -10000,
        left: position?.left ?? -10000,
        visibility: position ? "visible" : "hidden",
      }}
      className="z-[9999] w-50 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 text-left shadow-xl"
    >
      {children}
    </div>,
    document.body,
  );
}
