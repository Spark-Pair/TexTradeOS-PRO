import { createContext, useCallback, useEffect, useState } from "react";
import { AUTH_SESSION_EXPIRED_EVENT, storage } from "../api/apiClient";
import { getMe, logoutUser } from "../api/auth.api";
import { useToast } from "./ToastContext";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

const normalizeUser = (source) => source ? {
  ...source,
  _id: source._id || source.id,
  id: source.id || source._id,
  businessId: source.business?.id || source.businessId,
} : null;

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const activateUser = useCallback((source) => {
    const nextUser = normalizeUser(source);
    setUser(nextUser);
    return nextUser;
  }, []);

  const refreshUser = useCallback(async () => {
    const { accessToken, refreshToken, sessionId } = storage.getAuth();
    if (!accessToken && !(refreshToken && sessionId)) {
      setUser(null);
      return null;
    }
    const response = await getMe();
    return activateUser(response?.user);
  }, [activateUser]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refreshUser()
      .catch(() => {
        if (active) {
          setUser(null);
          storage.clearAuth();
        }
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [refreshUser]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      showToast({ type: "error", message: "Your session expired. Please log in again." });
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [showToast]);

  const login = useCallback(async (authData) => {
    setLoading(true);
    try {
      const activeUser = activateUser(authData?.user);
      if (!activeUser) return { success: false };
      showToast({ type: "success", message: `Welcome back, ${activeUser.name || activeUser.username}!` });
      return { success: true };
    } finally {
      setLoading(false);
    }
  }, [activateUser, showToast]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      showToast({ type: "success", message: "Logged out successfully" });
      return { success: true };
    } finally {
      // logoutUser clears auth credentials even if the revoke request fails.
      storage.clearAuth();
      setUser(null);
      setLoading(false);
    }
  }, [showToast]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
