import { AlertTriangle, Download, ExternalLink, RefreshCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "../api/apiClient";
import useAuth from "../hooks/useAuth";
import Button from "./Button";

const DISMISSED_KEY = "textradeos-dismissed-update";

export default function UpdateManager() {
  const { user } = useAuth();
  const started = useRef(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [installing, setInstalling] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!user || started.current || import.meta.env.DEV) return;
    started.current = true;
    apiClient.get("/updates/status")
      .then(({ data }) => {
        if (!data?.available || !data?.update) return;
        if (
          !data.update.mandatory &&
          localStorage.getItem(DISMISSED_KEY) === data.update.version
        ) return;
        setStatus(data);
      })
      .catch(() => {});
  }, [user]);

  const update = status?.update;
  if (!update) return null;

  const mandatory = Boolean(update.mandatory);
  const canInstall = user?.role === "developer" || user?.role === "admin";

  const dismiss = () => {
    if (mandatory || installing) return;
    localStorage.setItem(DISMISSED_KEY, update.version);
    setStatus(null);
  };

  const install = async () => {
    setInstalling(true);
    setError("");
    try {
      await apiClient.post("/updates/install");
      localStorage.removeItem(DISMISSED_KEY);
      setRequested(true);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Could not request the update");
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <span className={`rounded-2xl p-3 ${mandatory ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}>
            {mandatory ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {mandatory ? "Update required" : "Update available"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              TexTradeOS {update.version} is available. Installed version: {status.currentVersion}.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
          {requested
            ? "The update was approved. Keep the server computer and launcher running while it installs."
            : update.notes || (mandatory
              ? "This release must be installed before the application can continue."
              : "A newer release is ready for installation.")}
        </div>

        {!status.online && (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Connect the server computer to the internet to install this update.
          </p>
        )}
        {!canInstall && !requested && (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Ask an administrator to approve the update from an admin account.
          </p>
        )}
        {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <a
            href={update.releaseUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2.5 text-sm text-gray-600"
          >
            <ExternalLink size={16} />
            Release details
          </a>
          {!mandatory && !requested && (
            <Button variant="secondary" outline onClick={dismiss} disabled={installing}>
              Later
            </Button>
          )}
          {canInstall && !requested && (
            <Button
              icon={installing ? RefreshCcw : Download}
              loading={installing}
              disabled={!status.online}
              onClick={install}
            >
              Update to {update.version}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
