import {
  ArchiveRestore,
  Database,
  Download,
  FileKey2,
  HardDrive,
  RefreshCcw,
  Shield,
  Upload,
} from "lucide-react";
import { createElement, useEffect, useState } from "react";
import Button from "./Button";
import { useToast } from "../context/ToastContext";
import {
  fetchSystemCommand,
  fetchSystemDiagnostics,
  fetchSystemStatus,
  fetchSetupCommand,
  requestSystemCommand,
  requestUpdateInstall,
  waitForCommand,
} from "../api/system";

const formatBytes = (value) => {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

export default function SystemManagement() {
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState("");

  const refresh = async () => {
    const { data } = await fetchSystemStatus();
    setStatus(data);
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const runCommand = async (type, payload = {}) => {
    setBusy(type);
    try {
      const { data } = await requestSystemCommand(type, payload);
      if (type !== "restore") {
        await waitForCommand(fetchSystemCommand, data.id, 45000);
        await refresh();
      }
      showToast({
        type: "success",
        message: type === "restore"
          ? "Restore started. TexTradeOS will reconnect automatically."
          : `${type[0].toUpperCase()}${type.slice(1)} completed`,
      });
    } catch (error) {
      showToast({ type: "error", message: error?.response?.data?.message || error.message });
    } finally {
      setBusy("");
    }
  };

  const importLicense = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("license");
    try {
      const document = JSON.parse(await file.text());
      const response = await fetch("/api/setup/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(document),
      });
      const command = await response.json();
      if (!response.ok) throw new Error(command.message || "License import failed");
      await waitForCommand(fetchSetupCommand, command.id);
      await refresh();
      showToast({ type: "success", message: "License installed" });
    } catch (error) {
      showToast({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const installUpdate = async () => {
    setBusy("update");
    try {
      await requestUpdateInstall();
      showToast({ type: "success", message: "Update approved. Installation is starting." });
    } catch (error) {
      showToast({ type: "error", message: error?.response?.data?.message || "Update failed" });
    } finally {
      setBusy("");
    }
  };

  const downloadDiagnostics = async () => {
    setBusy("diagnostics");
    try {
      const { data } = await fetchSystemDiagnostics();
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "TexTradeOS-Diagnostics.json";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy("");
    }
  };

  const backups = status?.backups || [];
  const update = status?.update?.update;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-gray-300 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 bg-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-white">
            <HardDrive size={17} className="text-gray-500" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">System Management</h2>
            <p className="mt-0.5 text-xs text-gray-400">Server, license, updates and recovery</p>
          </div>
        </div>
        <Button outline icon={RefreshCcw} size="sm" onClick={refresh}>Refresh</Button>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-3">
        <InfoCard icon={Database} label="Database" value={formatBytes(status?.databaseSize)} />
        <InfoCard icon={FileKey2} label="License" value={
          status?.license?.allowed ? status.license.customer : status?.license?.message || "Checking..."
        } />
        <InfoCard icon={RefreshCcw} label="Version" value={status?.version || "Checking..."} />
      </div>

      <div className="grid gap-4 border-t border-gray-200 p-5 md:grid-cols-2">
        <ActionPanel title="License" icon={FileKey2}>
          <a href="/api/setup/fingerprint" download className="text-sm font-medium text-teal-700 hover:underline">
            Download fingerprint request
          </a>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-teal-700 hover:underline">
            <Upload size={15} />
            {busy === "license" ? "Importing..." : "Import replacement license"}
            <input type="file" accept=".json" className="hidden" onChange={importLicense} />
          </label>
        </ActionPanel>

        <ActionPanel title="Updates" icon={Download}>
          <p className="text-sm text-gray-600">
            {update ? `Version ${update.version} is available.` : "TexTradeOS is up to date."}
          </p>
          {update && (
            <Button size="sm" loading={busy === "update"} onClick={installUpdate}>
              Install {update.version}
            </Button>
          )}
        </ActionPanel>

        <ActionPanel title="Backup" icon={Database}>
          <p className="text-sm text-gray-600">Create a consistent SQLite snapshot.</p>
          <Button size="sm" loading={busy === "backup"} onClick={() => runCommand("backup")}>
            Create Backup
          </Button>
        </ActionPanel>

        <ActionPanel title="Network" icon={Shield}>
          <p className="text-sm text-gray-600">Allow browser access on LAN port 8080.</p>
          <Button size="sm" outline loading={busy === "firewall"} onClick={() => runCommand("firewall")}>
            Configure Firewall
          </Button>
          <button
            type="button"
            onClick={downloadDiagnostics}
            disabled={busy === "diagnostics"}
            className="text-left text-sm font-medium text-teal-700 hover:underline disabled:opacity-60"
          >
            {busy === "diagnostics" ? "Preparing diagnostics..." : "Download diagnostics"}
          </button>
        </ActionPanel>
      </div>

      <div className="border-t border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800">Available Backups</h3>
        <div className="mt-3 space-y-2">
          {backups.length === 0 && <p className="text-sm text-gray-400">No backups created yet.</p>}
          {backups.map((backup) => (
            <div key={backup.name} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 p-3">
              <div>
                <p className="text-sm font-medium text-gray-700">{backup.name}</p>
                <p className="text-xs text-gray-400">{formatBytes(backup.size)}</p>
              </div>
              <Button
                size="sm"
                outline
                variant="warning"
                icon={ArchiveRestore}
                loading={busy === "restore"}
                onClick={() => {
                  if (window.confirm("Replace the current database with this backup?")) {
                    runCommand("restore", { backup: backup.name });
                  }
                }}
              >
                Restore
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      {createElement(icon, { size: 18, className: "text-teal-700" })}
      <p className="mt-3 text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function ActionPanel({ title, icon, children }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        {createElement(icon, { size: 17, className: "text-teal-700" })}
        {title}
      </div>
      {children}
    </div>
  );
}
