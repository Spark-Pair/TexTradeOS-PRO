import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEWPORT_GAP = 10;
const TRIGGER_GAP = 6;

export default function ContextMenu({ isOpen, children, onClose }) {
  const menuRef = useRef(null);
  const anchorRef = useRef(null);
  const closeRef = useRef(onClose);
  const [position, setPosition] = useState(null);
  const [mounted, setMounted] = useState(false);

  closeRef.current = onClose;

  useEffect(() => {
    setMounted(Boolean(isOpen));
    if (!isOpen) {
      anchorRef.current = null;
      setPosition(null);
    }
  }, [isOpen]);

  const dismiss = () => {
    // Remove the portal from the DOM immediately. Parent state is then reset as well,
    // so the next trigger click creates a fresh menu instance.
    setMounted(false);
    setPosition(null);
    anchorRef.current = null;
    closeRef.current?.();
  };

  useLayoutEffect(() => {
    if (!isOpen || !mounted) return undefined;

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
  }, [isOpen, mounted]);

  useEffect(() => {
    if (!isOpen || !mounted) return undefined;

    const keyDown = (event) => {
      if (event.key !== "Escape" && event.key !== "Esc" && event.code !== "Escape") return;
      event.preventDefault();
      dismiss();
    };

    const pointerDown = (event) => {
      if (menuRef.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      dismiss();
    };

    const scrollOrWheel = () => dismiss();

    window.addEventListener("keydown", keyDown, true);
    document.addEventListener("keydown", keyDown, true);
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("mousedown", pointerDown, true);
    document.addEventListener("scroll", scrollOrWheel, true);
    window.addEventListener("scroll", scrollOrWheel, true);
    document.addEventListener("wheel", scrollOrWheel, true);
    window.addEventListener("wheel", scrollOrWheel, true);
    document.addEventListener("touchmove", scrollOrWheel, true);

    return () => {
      window.removeEventListener("keydown", keyDown, true);
      document.removeEventListener("keydown", keyDown, true);
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("mousedown", pointerDown, true);
      document.removeEventListener("scroll", scrollOrWheel, true);
      window.removeEventListener("scroll", scrollOrWheel, true);
      document.removeEventListener("wheel", scrollOrWheel, true);
      window.removeEventListener("wheel", scrollOrWheel, true);
      document.removeEventListener("touchmove", scrollOrWheel, true);
    };
  }, [isOpen, mounted]);

  if (typeof document === "undefined" || !isOpen || !mounted) return null;

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
