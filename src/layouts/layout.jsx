import React, { useEffect, useState } from 'react';
import SidebarNav from '../components/SidebarNav';
import useAuth from '../hooks/useAuth';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import UpdateManager from "../components/UpdateManager";
import GlobalKeyboardShortcuts from "../components/GlobalKeyboardShortcuts";

export default function Layout({ children }) {
  const { logout } = useAuth();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
              {children || <Outlet />}
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
