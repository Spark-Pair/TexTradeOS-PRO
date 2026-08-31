import React, { useEffect, useState } from 'react';
import SidebarNav from '../components/SidebarNav';
import useAuth from '../hooks/useAuth';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import UpdateManager from "../components/UpdateManager";
import { syncPrototypeData } from "../utils/prototypeStorage";

export default function Layout({ children }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sharedDataReady, setSharedDataReady] = useState(false);

  useEffect(() => {
    let active = true;
    setSharedDataReady(false);
    syncPrototypeData()
      .catch(() => {})
      .finally(() => { if (active) setSharedDataReady(true); });
    return () => { active = false; };
  }, [location.pathname, user?.businessId]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
    } finally {
      setLogoutLoading(false);
      setLogoutConfirmOpen(false);
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      {/* Sidebar (Desktop) */}
      <div className="hidden lg:block">
        <SidebarNav
          currentPath={location.pathname}
          handleLogout={handleLogout}
        />
      </div>

      {/* Sidebar (Mobile Drawer) */}
      <div className="lg:hidden">
        <SidebarNav
          currentPath={location.pathname}
          handleLogout={handleLogout}
          isMobileOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <main className="relative flex-1 overflow-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6 min-w-0">
        {/* Mobile header */}
        <div className="absolute left-3 top-3 z-20 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm active:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="no-default-transition h-full"
          >
            {sharedDataReady
              ? (children || <Outlet />)
              : <div className="flex h-full items-center justify-center text-sm text-gray-400">Syncing shared business data...</div>}
          </motion.div>
        </AnimatePresence>
      </main>
      {sidebarOpen && (
        <button
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}
      <ConfirmModal
        isOpen={logoutConfirmOpen}
        onClose={() => {
          if (logoutLoading) return;
          setLogoutConfirmOpen(false);
        }}
        onConfirm={confirmLogout}
        isLoading={logoutLoading}
        closeOnConfirm={false}
        variant="danger"
        title="Logout"
        message="Are you sure you want to logout from this device?"
        confirmText="Logout"
        cancelText="Cancel"
      />
      <UpdateManager />
    </div>
  );
}
