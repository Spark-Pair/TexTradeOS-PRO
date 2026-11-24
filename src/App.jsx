import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import Layout from "./layouts/layout";
import { ToastProvider } from "./context/ToastContext";
import Login from "./pages/Login";
import Options from "./pages/Options";
import KeyboardShortcuts from "./pages/KeyboardShortcuts";
import { focusFirstField, focusNextField, isFormFieldTarget } from "./utils/focusNextField";
const MenuPage = lazy(() => import("./pages/Menu"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Customers = lazy(() => import("./pages/Customers"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const BankAccounts = lazy(() => import("./pages/BankAccounts"));
const BalanceEntries = lazy(() => import("./pages/BalanceEntries"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Payments = lazy(() => import("./pages/Payments"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Users = lazy(() => import("./pages/Users"));
const Settings = lazy(() => import("./pages/Settings"));
const Backup = lazy(() => import("./pages/Backup"));
const Setup = lazy(() => import("./pages/Setup"));
const BusinessSetup = lazy(() => import("./pages/BusinessSetup"));
const Returns = lazy(() => import("./pages/Returns"));
const SystemManagement = lazy(() => import("./pages/SystemManagement"));
const Reports = lazy(() => import("./pages/Reports"));
const NEGATIVE_NUMBER_REGEX =
  /^\(?\s*(?:PKR|RS\.?)?\s*-\s*\d[\d,]*(?:\.\d+)?\s*\)?$/i;
const NEGATIVE_NUMBER_CLASS = "is-negative-number";
const NON_NEGATIVE_TAGS = new Set([
  "INPUT",
  "TEXTAREA",
  "OPTION",
  "SCRIPT",
  "STYLE",
]);
export default function App() {
  useEffect(() => {
    let rafId = 0;
    const pendingElements = new Set();
    const update = (element) => {
      if (
        !(element instanceof Element) ||
        NON_NEGATIVE_TAGS.has(element.tagName)
      )
        return;
      const text = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.nodeValue || "")
        .join(" ")
        .trim()
        .replace(/\s+/g, " ");
      element.classList.toggle(
        NEGATIVE_NUMBER_CLASS,
        Boolean(text) && NEGATIVE_NUMBER_REGEX.test(text),
      );
    };
    const flush = () => {
      pendingElements.forEach(update);
      pendingElements.clear();
      rafId = 0;
    };
    const queue = (element) => {
      if (!(element instanceof Element)) return;
      pendingElements.add(element);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(flush);
    };
    const root = document.getElementById("root");
    if (!root) return undefined;
    queue(root);
    root.querySelectorAll("*").forEach((el) => pendingElements.add(el));
    rafId = requestAnimationFrame(flush);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData")
          return queue(mutation.target.parentElement);
        if (mutation.target instanceof Element) queue(mutation.target);
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            queue(node);
            node.querySelectorAll("*").forEach((el) => pendingElements.add(el));
          }
        });
      });
      if (!rafId && pendingElements.size) rafId = requestAnimationFrame(flush);
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;

    const thumb = document.createElement("div");
    thumb.className = "app-scrollbar-overlay";
    thumb.setAttribute("aria-hidden", "true");
    document.body.appendChild(thumb);

    let activeScroller = null;
    let hideTimer;
    let dragState = null;

    const isPageScroller = (element) => element === document.body || element === document.documentElement || element === document.scrollingElement;
    const isScrollable = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (isPageScroller(element)) return document.documentElement.scrollHeight > window.innerHeight + 2;
      const style = getComputedStyle(element);
      return /(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 2;
    };
    const findScroller = (event) => event.composedPath().find(isScrollable) || null;
    const setVisible = (element) => {
      if (!isScrollable(element)) return;
      activeScroller = element;
      clearTimeout(hideTimer);
      const page = isPageScroller(element);
      const rect = page ? { top: 0, right: window.innerWidth, bottom: window.innerHeight } : element.getBoundingClientRect();
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, rect.bottom);
      const trackHeight = Math.max(0, bottom - top);
      const viewportHeight = page ? window.innerHeight : element.clientHeight;
      const contentHeight = page ? document.documentElement.scrollHeight : element.scrollHeight;
      if (trackHeight < 24 || contentHeight <= viewportHeight) return;
      const thumbHeight = Math.min(trackHeight, Math.max(24, (viewportHeight / contentHeight) * trackHeight));
      const scrollTop = page ? window.scrollY : element.scrollTop;
      const scrollRange = Math.max(1, contentHeight - viewportHeight);
      const thumbTop = top + (scrollTop / scrollRange) * Math.max(0, trackHeight - thumbHeight);
      const right = page ? window.innerWidth : rect.right;
      thumb.style.left = `${Math.max(0, Math.min(window.innerWidth - 7, right - 7))}px`;
      thumb.style.top = `${thumbTop}px`;
      thumb.style.height = `${thumbHeight}px`;
      thumb.classList.add("is-visible");
    };
    const scheduleHide = () => {
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (!dragState && !thumb.matches(":hover")) thumb.classList.remove("is-visible");
      }, 650);
    };
    const onPointerMove = (event) => {
      if (thumb.contains(event.target)) return;
      const scroller = findScroller(event);
      if (scroller) setVisible(scroller);
      else if (activeScroller && !thumb.matches(":hover")) scheduleHide();
    };
    const onScroll = (event) => {
      const target = event.target;
      const scroller = isScrollable(target) ? target : document.scrollingElement;
      if (isScrollable(scroller)) setVisible(scroller);
      scheduleHide();
    };
    const onResize = () => activeScroller && setVisible(activeScroller);
    const onThumbPointerEnter = () => clearTimeout(hideTimer);
    const onThumbPointerLeave = scheduleHide;
    const onPointerDown = (event) => {
      event.preventDefault();
      if (!activeScroller) return;
      const page = isPageScroller(activeScroller);
      const viewportHeight = page ? window.innerHeight : activeScroller.clientHeight;
      const contentHeight = page ? document.documentElement.scrollHeight : activeScroller.scrollHeight;
      const thumbHeight = thumb.getBoundingClientRect().height;
      const rect = page ? { top: 0 } : activeScroller.getBoundingClientRect();
      const trackTop = Math.max(0, rect.top);
      const trackHeight = Math.max(1, Math.min(window.innerHeight, page ? window.innerHeight : rect.bottom) - trackTop);
      dragState = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startScroll: page ? window.scrollY : activeScroller.scrollTop,
        scrollRange: Math.max(0, contentHeight - viewportHeight),
        thumbRange: Math.max(1, trackHeight - thumbHeight),
      };
      thumb.setPointerCapture(event.pointerId);
    };
    const onPointerDrag = (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId || !activeScroller) return;
      const next = dragState.startScroll + ((event.clientY - dragState.startY) / dragState.thumbRange) * dragState.scrollRange;
      if (isPageScroller(activeScroller)) window.scrollTo(0, next);
      else activeScroller.scrollTop = next;
      setVisible(activeScroller);
    };
    const onPointerUp = () => {
      dragState = null;
      scheduleHide();
    };

    thumb.addEventListener("pointerenter", onThumbPointerEnter);
    thumb.addEventListener("pointerleave", onThumbPointerLeave);
    thumb.addEventListener("pointerdown", onPointerDown);
    thumb.addEventListener("pointermove", onPointerDrag);
    thumb.addEventListener("pointerup", onPointerUp);
    thumb.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(hideTimer);
      thumb.removeEventListener("pointerenter", onThumbPointerEnter);
      thumb.removeEventListener("pointerleave", onThumbPointerLeave);
      thumb.removeEventListener("pointerdown", onPointerDown);
      thumb.removeEventListener("pointermove", onPointerDrag);
      thumb.removeEventListener("pointerup", onPointerUp);
      thumb.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      thumb.remove();
    };
  }, []);
  useEffect(() => {
    const blocked = new Set([
      "checkbox",
      "radio",
      "file",
      "date",
      "month",
      "time",
      "datetime-local",
      "color",
      "range",
      "button",
      "submit",
      "reset",
      "image",
      "hidden",
    ]);
    const handler = (event) => {
      const target = event.target;
      if (
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement
        ) ||
        target.hasAttribute("data-no-auto-select") ||
        target.disabled ||
        target.readOnly ||
        (target instanceof HTMLInputElement &&
          blocked.has(String(target.type || "").toLowerCase()))
      )
        return;
      requestAnimationFrame(() => {
        if (document.activeElement === target && String(target.value || ""))
          try {
            target.select();
          } catch {
            // Some input types do not support programmatic selection.
          }
      });
    };
    document.addEventListener("focusin", handler, true);
    return () => document.removeEventListener("focusin", handler, true);
  }, []);
  useEffect(() => {
    const handleEnter = (event) => {
      if (event.key !== "Enter" || event.isComposing) return;

      const target = event.target;
      if (
        !isFormFieldTarget(target) ||
        target.disabled ||
        target.readOnly ||
        target.matches?.('[data-shortcut-capture="true"] *')
      ) return;

      // Enter in a textarea remains available for line breaks.
      if (target instanceof HTMLTextAreaElement) return;

      if (focusNextField(target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("keydown", handleEnter);
    return () => document.removeEventListener("keydown", handleEnter);
  }, []);
  useEffect(() => {
    const focusForm = (form) => {
      // Let the browser finish the current render before focusing. This also
      // covers forms whose first field becomes available in the same update.
      requestAnimationFrame(() => focusFirstField(form));
    };

    const initialForm = [...document.querySelectorAll("form")].find(
      (form) => form.getClientRects().length > 0,
    );
    if (initialForm) focusForm(initialForm);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches("form")) focusForm(node);
          node.querySelectorAll("form").forEach(focusForm);
        });
      });
    });

    const root = document.getElementById("root");
    if (!root) return undefined;
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  const fallback = (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      Loading...
    </div>
  );
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={fallback}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/setup" element={<Setup />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<MenuPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/business-setup" element={<RoleRoute allow={["developer"]}><BusinessSetup /></RoleRoute>} />
                <Route
                  path="/users"
                  element={
                    <RoleRoute allow={["developer"]} accessKey="users_manage">
                      <Users />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RoleRoute accessKey="settings">
                      <Settings />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/system-management"
                  element={
                    <RoleRoute allow={["developer", "admin"]}>
                      <SystemManagement />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/backup"
                  element={
                    <RoleRoute allow={["developer", "admin"]}>
                      <Backup />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/options"
                  element={
                    <RoleRoute accessKey="options">
                      <Options />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <RoleRoute accessKey="customers">
                      <Customers />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/suppliers"
                  element={
                    <RoleRoute accessKey="suppliers">
                      <Suppliers />
                    </RoleRoute>
                  }
                />
                <Route path="/bank-accounts" element={<RoleRoute accessKey="bank_accounts"><BankAccounts /></RoleRoute>} />
                <Route path="/balance-entries" element={<RoleRoute accessKey="balance_entries"><BalanceEntries /></RoleRoute>} />
                <Route
                  path="/purchases"
                  element={
                    <RoleRoute accessKey="purchases">
                      <Purchases />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <RoleRoute accessKey="payments">
                      <Payments />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/expenses"
                  element={
                    <RoleRoute accessKey="expenses">
                      <Expenses />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <RoleRoute accessKey="inventory">
                      <Inventory />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/sales-returns"
                  element={
                    <RoleRoute accessKey="sales_returns">
                      <Returns type="sales" />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/purchase-returns"
                  element={
                    <RoleRoute accessKey="purchase_returns">
                      <Returns type="purchase" />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/invoices"
                  element={
                    <RoleRoute accessKey="invoices">
                      <Invoices />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <RoleRoute accessKey="reports">
                      <Reports />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/keyboard-shortcuts"
                  element={
                    <RoleRoute accessKey="keyboard_shortcuts">
                      <KeyboardShortcuts />
                    </RoleRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Login />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
