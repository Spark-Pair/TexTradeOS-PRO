import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken");
  const sessionId = localStorage.getItem("sessionId");
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (sessionId) config.headers["x-session-id"] = sessionId;
  return config;
});

export const storage = {
  getAuth() {
    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
      sessionId: localStorage.getItem("sessionId"),
    };
  },

  setAuth(accessToken, refreshToken, sessionId) {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("sessionId", sessionId);
  },

  clearAuth() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("sessionId");
  },

  updateAccessToken(accessToken) {
    localStorage.setItem("accessToken", accessToken);
  },
};
