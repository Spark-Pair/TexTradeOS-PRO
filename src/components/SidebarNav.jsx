import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, FileText, Users2, Settings, LogOut, ChevronDown, Keyboard } from 'lucide-react';
import SidebarNavItem from './SidebarNavItem';
import useAuth from '../hooks/useAuth';
import { AnimatePresence } from "framer-motion";
import { fetchMyInvoiceCounter, fetchMyReferenceData, fetchMyRuleData } from '../api/business';
import { BUSINESS_ACCESS_ITEMS, hasAccessForRole } from '../utils/accessConfig';

const developerNav = [
  { id: 'dashboard', icon: <LayoutGrid className="w-4.5 h-4.5" />, label: 'Dashboard', path: '/dashboard' },
  { id: 'users', icon: <Users2 className="w-4.5 h-4.5" />, label: 'Users', path: '/users' },
  { id: 'invoices', icon: <FileText className="w-4.5 h-4.5" />, label: 'Invoices', path: '/invoices' },
];

const adminNav = [
  { id: 'dashboard', icon: <LayoutGrid className="w-4.5 h-4.5" />, label: 'Dashboard', path: '/dashboard' },
  { id: 'users', icon: <Users2 className="w-4.5 h-4.5" />, label: 'Users', path: '/users' },
  { id: 'invoices', icon: <FileText className="w-4.5 h-4.5" />, label: 'Invoices', path: '/invoices' },
];

const staffNav = [
  { id: 'dashboard', icon: <LayoutGrid className="w-4.5 h-4.5" />, label: 'Dashboard', path: '/dashboard' },
  { id: 'invoices', icon: <FileText className="w-4.5 h-4.5" />, label: 'Invoices', path: '/invoices' },
];

const iconMap = {
  dashboard: <LayoutGrid className="w-4.5 h-4.5" />,
  users_manage: <Users2 className="w-4.5 h-4.5" />,
  invoices: <FileText className="w-4.5 h-4.5" />,
};

const SidebarNav = ({ currentPath, handleLogout, isMobileOpen = false, onCloseMobile }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [referenceData, setReferenceData] = useState({});
  const [ruleData, setRuleData] = useState({});
  const dropdownRef = useRef(null);
  const prefetchedRoutesRef = useRef(new Set());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || user.role === "developer") return;
    let isMounted = true;

    const loadAccessData = async () => {
      const [referenceRes, ruleRes] = await Promise.all([
        fetchMyReferenceData().catch(() => ({ reference_data: {} })),
        fetchMyRuleData().catch(() => ({ rule_data: {} })),
      ]);
      if (!isMounted) return;
      setReferenceData(referenceRes?.reference_data || {});
      setRuleData(ruleRes?.rule_data || {});
    };

    loadAccessData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  let navItems = [];
  if (user.role === 'developer') navItems = developerNav;
  if (user.role === 'admin') navItems = adminNav;
  if (user.role === 'staff') navItems = staffNav;
  if (user.role !== "developer") {
    navItems = BUSINESS_ACCESS_ITEMS
      .filter((item) => item.show_in_sidebar)
      .filter((item) => hasAccessForRole(ruleData, referenceData, item.key, user.role))
      .map((item) => ({
        id: item.key,
        icon: iconMap[item.key],
        label: item.label,
        path: item.path,
      }));
  }
  const canManagePersonalSettings = user.role === "developer" || hasAccessForRole(ruleData, referenceData, "settings", user.role);
  const canUseKeyboardShortcuts = user.role === "developer" || hasAccessForRole(ruleData, referenceData, "keyboard_shortcuts", user.role);

  const isActive = (path) => {
    if (!path) return false;
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  // Get user initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDropdownAction = (action) => {
    setIsDropdownOpen(false);
    action();
  };

  const handleNav = (path) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const runWhenIdle = (task) => {
    if (typeof window === 'undefined') return;
    const runTask = () => {
      Promise.resolve(task()).catch(() => {});
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(runTask, { timeout: 1200 });
      return;
    }
    window.setTimeout(runTask, 120);
  };

  const prefetchRoute = (path) => {
    if (!path || prefetchedRoutesRef.current.has(path)) return;
    prefetchedRoutesRef.current.add(path);

    runWhenIdle(async () => {
      switch (path) {
        case '/dashboard': {
          const { fetchDashboardTrend } = await import('../api/dashboard');
          const now = new Date();
          const dateTo = now.toISOString().slice(0, 10);
          now.setDate(now.getDate() - 29);
          const dateFrom = now.toISOString().slice(0, 10);
          await fetchDashboardTrend({ date_from: dateFrom, date_to: dateTo });
          break;
        }
        case '/invoices': {
          const invoiceApi = await import('../api/invoice');
          await Promise.allSettled([
            invoiceApi.fetchInvoices({ page: 1, limit: 20 }),
            invoiceApi.fetchInvoiceOrderGroups({ page: 1, limit: 20 }),
            fetchMyInvoiceCounter(),
          ]);
          break;
        }
        case '/settings': {
          await Promise.allSettled([
            fetchMyReferenceData(),
            fetchMyRuleData(),
          ]);
          break;
        }
        case '/users': {
          const { fetchUsers, fetchUserStats } = await import('../api/user');
          await Promise.allSettled([
            fetchUsers({ page: 1, limit: 20 }),
            fetchUserStats(),
          ]);
          break;
        }
        default:
          break;
      }
    });
  };

  const mobileClasses = `
    fixed inset-y-0 left-0 z-40 w-[280px] p-4
    transition-transform duration-200 ease-out
    ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
    lg:static lg:translate-x-0 lg:w-78 lg:p-6
  `;

  return (
    <aside className={`${mobileClasses} h-full lg:h-screen no-default-transition`}>
      <div className="bg-white p-4 flex flex-col gap-4 h-full border border-gray-300 rounded-3xl">
        {/* Top */}
        <div className="flex items-center gap-1.5 ps-3 pt-2.5 pb-5 border-b border-gray-300">
          <div className="h-9 w-9 shrink-0 overflow-hidden">
            <img
              src="/android-chrome-192x192.png"
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-[1.35rem] font-semibold tracking-wide text-[#1C7773]">
            TexTradeOS
          </h1>
        </div>

        {/* Menu */}
        <div className="flex flex-col justify-between h-full min-h-0">
          <nav className="space-y-1 overflow-y-auto pr-1">
            {navItems.map(item => (
              <SidebarNavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.path)}
                onClick={() => handleNav(item.path)}
                onMouseEnter={() => prefetchRoute(item.path)}
                onFocus={() => prefetchRoute(item.path)}
              />
            ))}
          </nav>

          {/* Profile Dropdown Section */}
          <div className="pt-3 border-t border-gray-300" ref={dropdownRef}>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-200/70"
              >
                <div className="w-8 h-8 rounded-full bg-[#1C7773] flex items-center justify-center text-white font-medium text-sm">
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user.role}
                  </p>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <div
                    className="absolute bottom-full left-0 right-0 mb-2 bg-white
                              border border-gray-300 rounded-2xl shadow-lg overflow-hidden no-default-transition"
                  >
                    <div className="p-2">
                      {(canManagePersonalSettings || canUseKeyboardShortcuts) && (
                        <>
                          {canManagePersonalSettings && (
                            <button
                              onClick={() => handleDropdownAction(() => handleNav('/settings'))}
                              onMouseEnter={() => prefetchRoute('/settings')}
                              onFocus={() => prefetchRoute('/settings')}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-200/60 text-left rounded-xl cursor-pointer"
                            >
                              <Settings className="w-4 h-4 text-gray-600" />
                              <span className="text-sm text-gray-700">Settings</span>
                            </button>
                          )}

                          {canUseKeyboardShortcuts && (
                            <button
                              onClick={() => handleDropdownAction(() => handleNav('/keyboard-shortcuts'))}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-200/60 text-left rounded-xl cursor-pointer"
                            >
                              <Keyboard className="w-4 h-4 text-gray-600" />
                              <span className="text-sm text-gray-700">Keyboard Shortcuts</span>
                            </button>
                          )}
                        </>
                      )}

                      <div className="h-px bg-gray-300 my-1.5" />

                      <button
                        onClick={() => handleDropdownAction(handleLogout)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 text-left rounded-xl cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600 font-medium">Logout</span>
                      </button>
                    </div>
                    </div>
                  )}
                </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SidebarNav;
