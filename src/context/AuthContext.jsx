import { createContext, useCallback, useEffect, useState } from "react";
import { AUTH_SESSION_EXPIRED_EVENT, storage } from "../api/apiClient";
import { clearOfflineData, initOfflineForUser, offlineAccess } from "../offline/idb";
import { useToast } from "./ToastContext";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

const readCachedUser = () => {
  try {
    const raw = localStorage.getItem("cachedUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const activateUser = useCallback(async (nextUser) => {
    if (!nextUser) return null;
    setUser(nextUser);
    localStorage.setItem("cachedUser", JSON.stringify(nextUser));
    offlineAccess.unlock();
    await initOfflineForUser({
      userId: nextUser._id || nextUser.id,
      businessId: nextUser.businessId?._id || nextUser.businessId || nextUser.business?.id,
    });
    return nextUser;
  }, []);

  useEffect(() => {
    const cachedUser = readCachedUser();
    const { accessToken, refreshToken, sessionId } = storage.getAuth();
    const hasStoredSession = accessToken || (refreshToken && sessionId);
    if (cachedUser && hasStoredSession) {
      activateUser(cachedUser).finally(() => setLoading(false));
      return;
    }
    if (cachedUser && !hasStoredSession) {
      localStorage.removeItem("cachedUser");
    }
    setLoading(false);
  }, [activateUser]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      localStorage.removeItem("cachedUser");
      offlineAccess.lock();
      clearOfflineData().catch(() => null);
      showToast({
        type: "error",
        message: "Your session expired. Please log in again.",
      });
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [showToast]);

  const login = useCallback(async (authData) => {
    setLoading(true);
    try {
      const source = authData?.user;
      const nextUser = source
        ? {
            ...source,
            _id: source._id || source.id,
            id: source.id || source._id,
            businessId: source.business?.id || source.businessId,
          }
        : null;
      const activeUser = await activateUser(nextUser);
      if (!activeUser) return { success: false };
      showToast({
        type: "success",
        message: `Welcome back, ${activeUser.name || activeUser.username}!`,
      });
      return { success: true };
    } finally {
      setLoading(false);
    }
  }, [activateUser, showToast]);

  const logout = useCallback(async () => {
    setUser(null);
    storage.clearAuth();
    localStorage.removeItem("cachedUser");
    offlineAccess.lock();
    await clearOfflineData().catch(() => null);
    showToast({ type: "success", message: "Logged out successfully" });
    return { success: true };
  }, [showToast]);

  const refreshUser = useCallback(async () => {
    const cachedUser = readCachedUser();
    if (cachedUser) setUser(cachedUser);
    return cachedUser;
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
