import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

export const AUTH_SESSION_EXPIRED_EVENT = "textradeos:session-expired";

let refreshPromise = null;
let sessionExpiryHandled = false;

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
    sessionExpiryHandled = false;
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

const isAuthenticationRequest = (url = "") =>
  url.includes("/auth/login") || url.includes("/auth/refresh");

const refreshSession = async () => {
  const { refreshToken, sessionId } = storage.getAuth();
  if (!refreshToken || !sessionId) {
    throw new Error("No refresh credentials available");
  }

  const response = await axios.post(
    `${apiClient.defaults.baseURL}/auth/refresh`,
    { refreshToken, sessionId },
    { headers: { "Content-Type": "application/json" } }
  );
  storage.updateAccessToken(response.data.accessToken);
  return response.data.accessToken;
};

const expireLocalSession = () => {
  storage.clearAuth();
  if (sessionExpiryHandled) return;
  sessionExpiryHandled = true;
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      isAuthenticationRequest(request.url)
    ) {
      return Promise.reject(error);
    }

    const { refreshToken, sessionId } = storage.getAuth();
    if (!refreshToken || !sessionId) {
      expireLocalSession();
      return Promise.reject(error);
    }

    request._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshSession().finally(() => {
          refreshPromise = null;
        });
      }
      const accessToken = await refreshPromise;
      request.headers = request.headers || {};
      request.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(request);
    } catch (refreshError) {
      expireLocalSession();
      return Promise.reject(refreshError);
    }
  }
);
