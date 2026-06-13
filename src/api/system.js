import { apiClient } from "./apiClient";

export const fetchSetupStatus = () => apiClient.get("/setup/status");
export const importSetupLicense = (document) => apiClient.post("/setup/license", document);
export const fetchSetupCommand = (id) => apiClient.get(`/setup/commands/${id}`);

export const fetchSystemStatus = () => apiClient.get("/system/status");
export const fetchSystemDiagnostics = () =>
  apiClient.get("/system/diagnostics", { responseType: "blob" });
export const requestSystemCommand = (type, payload = {}) =>
  apiClient.post("/system/commands", { type, ...payload });
export const fetchSystemCommand = (id) => apiClient.get(`/system/commands/${id}`);
export const requestUpdateInstall = () => apiClient.post("/updates/install");

export const waitForCommand = async (readCommand, id, timeout = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const { data } = await readCommand(id);
    if (data.state === "completed") return data;
    if (data.state === "failed") throw new Error(data.message || "System operation failed");
    await new Promise((resolve) => window.setTimeout(resolve, 800));
  }
  throw new Error("The operation is still running. Check again shortly.");
};
