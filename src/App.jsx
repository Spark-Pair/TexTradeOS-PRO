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
    const overlays = new Map();
    const hovered = new Set();
    let hideTimer;
    const getOverlay = (element) => {
      let overlay = overlays.get(element);
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "app-scrollbar-overlay";
        overlay.setAttribute("aria-hidden", "true");
        overlay.addEventListener("pointerenter", () => {
          hovered.add(element);
          clearTimeout(hideTimer);
          update(element, true);
        });
        overlay.addEventListener("pointerleave", () => {
          hovered.delete(element);
          scheduleHide(element);
        });
        overlay.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          const isPage = element === document.body || element === document.documentElement;
          const contentHeight = isPage ? document.documentElement.scrollHeight : element.scrollHeight;
          const viewportHeight = isPage ? window.innerHeight : element.clientHeight;
          const thumbHeight = overlay.getBoundingClientRect().height;
          const rect = isPage
            ? { top: 0, bottom: window.innerHeight }
            : element.getBoundingClientRect();
          const trackHeight = Math.max(
            0,
            Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top),
          );
          const scrollRange = contentHeight - viewportHeight;
          const thumbRange = trackHeight - thumbHeight;
          const startY = event.clientY;
          const startScroll = isPage ? window.scrollY : element.scrollTop;
          overlay.setPointerCapture(event.pointerId);
          const move = (moveEvent) => {
            const nextScroll = startScroll + ((moveEvent.clientY - startY) / Math.max(1, thumbRange)) * scrollRange;
            if (isPage) window.scrollTo(0, nextScroll);
            else element.scrollTop = nextScroll;
            update(element, true);
          };
          const finish = () => {
            overlay.removeEventListener("pointermove", move);
            overlay.removeEventListener("pointerup", finish);
            overlay.removeEventListener("pointercancel", finish);
          };
          overlay.addEventListener("pointermove", move);
          overlay.addEventListener("pointerup", finish, { once: true });
          overlay.addEventListener("pointercancel", finish, { once: true });
        });
        document.body.appendChild(overlay);
        overlays.set(element, overlay);
      }
      return overlay;
    };
    const isScrollable = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element === document.body || element === document.documentElement)
        return document.documentElement.scrollHeight > window.innerHeight + 2;
      const style = getComputedStyle(element);
      return /(auto|scroll|overlay)/.test(style.overflowY) &&
        element.scrollHeight > element.clientHeight + 2;
    };
    const update = (element, show = false) => {
      if (!isScrollable(element)) return;
      const overlay = getOverlay(element);
      const isPage = element === document.body || element === document.documentElement;
      const rect = isPage
        ? { top: 0, right: window.innerWidth, height: window.innerHeight }
        : element.getBoundingClientRect();
      const trackTop = Math.max(0, rect.top);
      const trackBottom = Math.min(window.innerHeight, rect.top + rect.height);
      const trackHeight = Math.max(0, trackBottom - trackTop);
      if (trackHeight < 24) return;
      const viewportHeight = isPage ? window.innerHeight : element.clientHeight;
      const contentHeight = isPage ? document.documentElement.scrollHeight : element.scrollHeight;
      const thumbHeight = Math.min(
        trackHeight,
        Math.max(14, (viewportHeight / contentHeight) * trackHeight),
      );
      const maxScroll = contentHeight - viewportHeight;
      const scrollTop = isPage ? window.scrollY : element.scrollTop;
      const scrollProgress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollTop / maxScroll)) : 0;
      const thumbTop = trackTop + scrollProgress * Math.max(0, trackHeight - thumbHeight);
      overlay.style.left = `${Math.max(0, Math.min(window.innerWidth - 7, rect.right - 7))}px`;
      overlay.style.top = `${thumbTop}px`;
      overlay.style.height = `${Math.min(thumbHeight, trackHeight)}px`;
      if (show) overlay.classList.add("is-visible");
    };
    const scan = (node = root) => {
      if (node instanceof HTMLElement && isScrollable(node)) getOverlay(node);
      node.querySelectorAll?.("*").forEach((element) => {
        if (isScrollable(element)) getOverlay(element);
      });
    };
    const findScroller = (event, fallback = true) => {
      for (const node of event.composedPath())
        if (isScrollable(node)) return node;
      return fallback ? document.scrollingElement || document.documentElement : null;
    };
    const scheduleHide = (element) => {
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (!hovered.has(element)) overlays.get(element)?.classList.remove("is-visible");
      }, 500);
    };
    const onPointerOver = (event) => {
      const element = findScroller(event, false);
      if (!isScrollable(element)) return;
      hovered.add(element);
      clearTimeout(hideTimer);
      update(element, true);
    };
    const onPointerOut = (event) => {
      const element = findScroller(event, false);
      if (!isScrollable(element)) return;
      const next = event.relatedTarget;
      if (next instanceof Node && element.contains(next)) return;
      if (next instanceof HTMLElement && next.classList.contains("app-scrollbar-overlay")) return;
      hovered.delete(element);
      scheduleHide(element);
    };
    const onScroll = (event) => {
      const element = event.target instanceof HTMLElement && isScrollable(event.target)
        ? event.target
        : findScroller(event);
      update(element, true);
      if (!hovered.has(element)) scheduleHide(element);
    };
    const onResize = () => overlays.forEach((_, element) => update(element));
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(({ addedNodes, removedNodes, target }) => {
        if (target instanceof HTMLElement) scan(target);
        addedNodes.forEach((node) => node instanceof HTMLElement && scan(node));
        removedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          overlays.forEach((overlay, element) => {
            if (element === node || node.contains(element)) {
              overlay.remove();
              overlays.delete(element);
            }
          });
        });
      });
    });
    scan();
    observer.observe(root, { childList: true, subtree: true });
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      clearTimeout(hideTimer);
      overlays.forEach((overlay) => overlay.remove());
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
