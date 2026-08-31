import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

const ToastContext = createContext();

const TOAST_STYLES = {
  success: { Icon: CheckCircle2, icon: "bg-emerald-100 text-emerald-700" },
  error: { Icon: XCircle, icon: "bg-red-100 text-red-700" },
  warning: { Icon: AlertTriangle, icon: "bg-amber-100 text-amber-700" },
  info: { Icon: Info, icon: "bg-sky-100 text-sky-700" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = "success", duration = 3500, title }) => {
    const text = String(message || "").trim();
    if (!text) return;
    const resolvedType = TOAST_STYLES[type] ? type : "info";
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setToasts((current) => {
      const withoutDuplicate = current.filter((toast) => !(toast.message === text && toast.type === resolvedType));
      return [...withoutDuplicate, { id, message: text, type: resolvedType, title }].slice(-3);
    });
    timersRef.current.set(id, window.setTimeout(() => removeToast(id), Math.max(1500, duration)));
  }, [removeToast]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[250] flex flex-col-reverse items-center gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:items-end" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const style = TOAST_STYLES[toast.type];
            const ToastIcon = style.Icon;
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.97 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`pointer-events-auto w-full max-w-[26rem] rounded-2xl border border-l-4 border-gray-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.2)] sm:w-[22rem]`}
                role={toast.type === "error" ? "alert" : "status"}
              >
                <div className="flex items-center gap-3 p-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.icon}`}><ToastIcon className="h-5 w-5" strokeWidth={2.2} /></span>
                  <div className="min-w-0 flex-1">
                    {toast.title && <p className="text-sm font-semibold text-gray-900">{toast.title}</p>}
                    <p className={`break-words text-sm leading-5 text-gray-700 ${toast.title ? "mt-0.5" : "font-medium"}`}>{toast.message}</p>
                  </div>
                  <button type="button" onClick={() => removeToast(toast.id)} className="-mr-1 -mt-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Dismiss notification">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
