import React, { useCallback, useEffect, useState } from 'react';
import SidebarNav from '../components/SidebarNav';
import useAuth from '../hooks/useAuth';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Menu, RefreshCw } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import UpdateManager from "../components/UpdateManager";
import { syncPrototypeData } from "../utils/prototypeStorage";
import GlobalKeyboardShortcuts from "../components/GlobalKeyboardShortcuts";

export default function Layout({ children }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sharedDataReady, setSharedDataReady] = useState(false);
  const [sharedDataError, setSharedDataError] = useState("");
  const [syncAttempt, setSyncAttempt] = useState(0);

  const retrySharedData = useCallback(() => setSyncAttempt((attempt) => attempt + 1), []);

  useEffect(() => {
    let active = true;
    setSharedDataReady(false);
    setSharedDataError("");

    syncPrototypeData()
      .then(() => {
        if (active) setSharedDataReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setSharedDataReady(false);
        setSharedDataError(error?.response?.data?.message || error?.message || "Could not load business data from the server.");
      });

    return () => { active = false; };
  }, [location.pathname, user?.businessId, syncAttempt]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);
  const handleLogout = () => setLogoutConfirmOpen(true);
  const confirmLogout = async () => { setLogoutLoading(true); try { await logout(); } finally { setLogoutLoading(false); setLogoutConfirmOpen(false); } };

  const pageMotion = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 12, scale: 0.995 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -6, scale: 0.998 }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } };

  return (
    <>
      <GlobalKeyboardShortcuts />
      <div className="flex h-[100dvh] overflow-hidden bg-[#f1f6f5]">
        <div className="hidden lg:block"><SidebarNav currentPath={location.pathname} handleLogout={handleLogout} /></div>
        <div className="lg:hidden"><SidebarNav currentPath={location.pathname} handleLogout={handleLogout} isMobileOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} /></div>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6">
          <div className="absolute left-3 top-3 z-30 lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200 bg-white text-[#1C7773] shadow-sm active:bg-teal-50" aria-label="Open menu"><Menu className="w-5 h-5" /></button>
          </div>
          <AnimatePresence mode="wait" initial>
            <motion.div key={location.pathname} initial={pageMotion.initial} animate={pageMotion.animate} exit={pageMotion.exit} transition={pageMotion.transition} className="no-default-transition min-h-0 flex-1 overflow-hidden">
              {sharedDataError ? (
                <div className="flex h-full items-center justify-center p-6">
                  <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
                    <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
                    <h2 className="mt-3 text-base font-semibold text-gray-900">Business data unavailable</h2>
                    <p className="mt-2 text-sm text-gray-500">{sharedDataError}</p>
                    <p className="mt-1 text-xs text-gray-400">No cached or demo business data will be shown.</p>
                    <button type="button" onClick={retrySharedData} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1C7773] px-4 text-sm font-medium text-white hover:bg-[#176864]">
                      <RefreshCw className="h-4 w-4" /> Retry
                    </button>
                  </div>
                </div>
              ) : sharedDataReady ? (
                children || <Outlet />
              ) : (
                <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex h-full items-center justify-center text-sm text-gray-400">Syncing shared business data...</motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {sidebarOpen && <button className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}
        <ConfirmModal isOpen={logoutConfirmOpen} onClose={() => { if (!logoutLoading) setLogoutConfirmOpen(false); }} onConfirm={confirmLogout} isLoading={logoutLoading} closeOnConfirm={false} variant="danger" title="Logout" message="Are you sure you want to logout from this device?" confirmText="Logout" cancelText="Cancel" />
        <UpdateManager />
      </div>
    </>
  );
}
