import React, { useEffect, useState } from 'react';
import SidebarNav from '../components/SidebarNav';
import useAuth from '../hooks/useAuth';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";

export default function Layout({ children }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="h-screen flex bg-gray-50 overflow-hidden">
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
      <main className="flex-1 p-3 sm:p-6 overflow-auto min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between mb-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 bg-white text-gray-700"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold text-gray-600">TexTradeOS</div>
          <div className="w-10 h-10" />
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
            {children || <Outlet />}
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
    </div>
  );
}
