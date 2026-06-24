import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import Layout from './layouts/layout';
import { ToastProvider } from './context/ToastContext';

// Pages
import Login from './pages/Login';

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Users = lazy(() => import("./pages/Users"));
const Settings = lazy(() => import("./pages/Settings"));
const KeyboardShortcuts = lazy(() => import("./pages/KeyboardShortcuts"));
const Setup = lazy(() => import("./pages/Setup"));

const NEGATIVE_NUMBER_REGEX = /^\(?\s*(?:PKR|RS\.?)?\s*-\s*\d[\d,]*(?:\.\d+)?\s*\)?$/i;
const NEGATIVE_NUMBER_CLASS = "is-negative-number";
const NON_NEGATIVE_TAGS = new Set(["INPUT", "TEXTAREA", "OPTION", "SCRIPT", "STYLE"]);

export default function App() {
  useEffect(() => {
    let rafId = 0;
    const pendingElements = new Set();

    const updateElementNegativeClass = (element) => {
      if (!(element instanceof Element)) return;
      if (NON_NEGATIVE_TAGS.has(element.tagName)) return;

      const directText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.nodeValue || "")
        .join(" ")
        .trim()
        .replace(/\s+/g, " ");

      element.classList.toggle(
        NEGATIVE_NUMBER_CLASS,
        Boolean(directText) && NEGATIVE_NUMBER_REGEX.test(directText)
      );
    };

    const flushPendingElements = () => {
      pendingElements.forEach((element) => updateElementNegativeClass(element));
      pendingElements.clear();
      rafId = 0;
    };

    const queueElement = (element) => {
      if (!(element instanceof Element)) return;
      pendingElements.add(element);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(flushPendingElements);
    };

    const root = document.getElementById("root");
    if (!root) return undefined;

    queueElement(root);
    root.querySelectorAll("*").forEach((element) => pendingElements.add(element));
    rafId = requestAnimationFrame(flushPendingElements);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          queueElement(mutation.target.parentElement);
          return;
        }

        if (mutation.target instanceof Element) {
          queueElement(mutation.target);
        }

        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          queueElement(node);
          node.querySelectorAll("*").forEach((element) => pendingElements.add(element));
        });

        mutation.removedNodes.forEach((node) => {
          const parent = mutation.target instanceof Element ? mutation.target : null;
          if (parent) queueElement(parent);
          if (node instanceof Element) {
            node.classList.remove(NEGATIVE_NUMBER_CLASS);
            node.querySelectorAll(`.${NEGATIVE_NUMBER_CLASS}`).forEach((element) => {
              element.classList.remove(NEGATIVE_NUMBER_CLASS);
            });
          }
        });
      });

      if (!rafId && pendingElements.size > 0) {
        rafId = requestAnimationFrame(flushPendingElements);
      }
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
    const NON_SELECTABLE_INPUT_TYPES = new Set([
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

    const canAutoSelect = (el) => {
      if (!el) return false;
      if (el.hasAttribute("data-no-auto-select")) return false;
      if (el.disabled || el.readOnly) return false;
      if (el instanceof HTMLTextAreaElement) return true;
      if (el instanceof HTMLInputElement) {
        return !NON_SELECTABLE_INPUT_TYPES.has(String(el.type || "").toLowerCase());
      }
      return false;
    };

    const selectFieldValue = (el) => {
      if (!canAutoSelect(el)) return;
      const value = String(el.value || "");
      if (!value) return;
      try {
        el.select();
      } catch {
        if (typeof el.setSelectionRange === "function") {
          el.setSelectionRange(0, value.length);
        }
      }
    };

    const handleFocusIn = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      requestAnimationFrame(() => {
        if (document.activeElement === target) {
          selectFieldValue(target);
        }
      });
    };

    document.addEventListener("focusin", handleFocusIn, true);
    return () => {
      document.removeEventListener("focusin", handleFocusIn, true);
    };
  }, []);

  const routeFallback = (
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
          <Suspense fallback={routeFallback}>
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
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
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
                <Route path="/invoices" element={<RoleRoute accessKey="invoices"><Invoices /></RoleRoute>} />
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
