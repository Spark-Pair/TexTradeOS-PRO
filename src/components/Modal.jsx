import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  maxWidth = "max-w-md",
}) {
  const [visibleViewport, setVisibleViewport] = useState({ height: 0, top: 0 });

  // ✅ ESC key close + scroll lock
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const viewport = window.visualViewport;
    const updateViewport = () => {
      setVisibleViewport({ height: viewport?.height || window.innerHeight, top: viewport?.offsetTop || 0 });
      window.setTimeout(() => {
        const active = document.activeElement;
        if (active?.matches?.("input, textarea, [data-focusable]")) active.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 80);
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
    };
  }, [isOpen]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-x-0 z-[100] flex items-end justify-center p-2 sm:items-center sm:p-4" style={{ height: visibleViewport.height || "100dvh", top: visibleViewport.top }}>
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onMouseDown={onClose}
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm no-default-transition"
          />

          {/* Modal Wrapper */}
          <motion.div
            initial={{ scale: 0.90, opacity: 0, y: 50 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              transition: {
                type: "spring",
                damping: 25,
                stiffness: 300,
                duration: 0.3
              }
            }}
            exit={{ 
              scale: 0.90, 
              opacity: 0, 
              y: 50,
              transition: {
                duration: 0.2,
                ease: "easeIn"
              }
            }}
            className="relative h-full w-full flex items-end justify-center overflow-hidden no-default-transition sm:items-center sm:p-3"

            // ✅ prevent close when clicking inside modal
            onMouseDown={onClose}
          >
            <div className={`modal-panel flex max-h-full w-full flex-col overflow-hidden rounded-3xl bg-white p-5 shadow-md sm:max-h-[94dvh] sm:p-7 ${maxWidth} sm:rounded-4xl`} onMouseDown={(e) => e.stopPropagation()}>
              
              {/* Header */}
              {(title || badge) && (
                <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold leading-tight text-gray-900 sm:text-2xl">
                        {title}
                      </h2>
                      {badge}
                    </div>
                    {subtitle && (
                      <p className="mt-1 text-sm font-normal leading-5 text-gray-400">
                        {subtitle}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="-mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer"
                    aria-label="Close dialog"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
              )}

              {/* Body */}
              <div className="min-h-0 grow overflow-y-auto overscroll-contain">
                {children}
              </div>

              {/* Footer */}
              {footer && <div className="modal-footer mt-4 border-t border-gray-100 pt-3 sm:mt-6 sm:border-0 sm:pt-0">{footer}</div>}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
