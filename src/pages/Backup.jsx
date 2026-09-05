import { ArchiveRestore, Database, Download, HardDrive, RefreshCcw, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { useToast } from "../context/ToastContext";
import {
  downloadSystemBackup,
  fetchSystemCommand,
  fetchSystemStatus,
  requestSystemCommand,
  uploadSystemRestore,
  waitForCommand,
} from "../api/system";

const formatBytes = (value) => {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

export default function BackupPage() {
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data } = await fetchSystemStatus();
      setStatus(data);
    } catch {
      showToast({ type: "error", message: "Failed to load backup status" });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { refresh(); }, [refresh]);

  const runCommand = async (type, payload = {}) => {
    setBusy(type);
    try {
      const { data } = await requestSystemCommand(type, payload);
      if (type !== "restore" || data.execution === "local") {
        await waitForCommand(fetchSystemCommand, data.id, 45000);
        await refresh();
      }
      showToast({ type: "success", message: type === "restore" ? "Restore started. TexTradeOS PRO will reconnect automatically." : "Backup created successfully" });
    } catch (error) {
      showToast({ type: "error", message: error?.response?.data?.message || error.message });
    } finally { setBusy(""); }
  };

  const downloadBackup = async (backup) => {
    setBusy(`download:${backup.name}`);
    try {
      const { data } = await downloadSystemBackup(backup.name);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = backup.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast({ type: "error", message: error?.response?.data?.message || "Backup download failed" });
    } finally { setBusy(""); }
  };

  const restoreFromComputer = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !window.confirm(`Replace the current database with ${file.name}?`)) return;
    setBusy("restore-upload");
    try {
      const { data } = await uploadSystemRestore(file);
      if (data.execution === "local") {
        await waitForCommand(fetchSystemCommand, data.id, 45000);
        await refresh();
      }
      showToast({ type: "success", message: "Restore started. TexTradeOS PRO will reconnect automatically." });
    } catch (error) {
      showToast({ type: "error", message: error?.response?.data?.message || error.message });
    } finally { setBusy(""); }
  };

  const backups = status?.backups || [];

  return (
    <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col">
      <PageHeader title="Backup" subtitle="Create, download and restore local database snapshots." rightContent={<Button outline icon={RefreshCcw} onClick={refresh}>Refresh</Button>} />

      <div className="grid shrink-0 gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-teal-200 bg-teal-50/60 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-200 bg-white text-teal-700"><Database size={19} /></span>
              <h2 className="mt-4 text-base font-semibold text-gray-900">Create database backup</h2>
              <p className="mt-1 max-w-md text-sm leading-5 text-gray-500">Create a consistent SQLite snapshot before updates or important data changes.</p>
            </div>
            <Button size="sm" loading={busy === "backup"} onClick={() => runCommand("backup")}>Create Backup</Button>
          </div>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-teal-700 hover:underline">
            <Upload size={15} />
            {busy === "restore-upload" ? "Uploading backup..." : "Restore backup from this computer"}
            <input type="file" accept=".sqlite,.db,application/x-sqlite3" className="hidden" onChange={restoreFromComputer} disabled={Boolean(busy)} />
          </label>
        </section>

        <section className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5 sm:p-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-sky-200 bg-white text-sky-700"><HardDrive size={19} /></span>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">Current database</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{loading ? "Checking..." : formatBytes(status?.databaseSize)}</p>
          <p className="mt-1 text-xs text-gray-500">{backups.length} backup{backups.length === 1 ? "" : "s"} available</p>
        </section>
      </div>

      <section className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-300 bg-white">
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:px-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500"><ArchiveRestore size={17} /></span>
          <div><h2 className="text-sm font-semibold text-gray-800">Available backups</h2><p className="mt-0.5 text-xs text-gray-400">Download a snapshot or restore it when needed.</p></div>
          <span className="ml-auto text-xs text-gray-400">{backups.length} total</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading ? <div className="py-12 text-center text-sm text-gray-400">Loading backups...</div> : backups.length === 0 ? <div className="py-12 text-center text-sm text-gray-400">No backups created yet.</div> : (
            <div className="divide-y divide-gray-200">
              {backups.map((backup) => (
                <div key={backup.name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-gray-50/80 sm:px-6">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800">{backup.name}</p><p className="mt-0.5 text-xs text-gray-400">{formatBytes(backup.size)}</p></div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" outline icon={Download} loading={busy === `download:${backup.name}`} onClick={() => downloadBackup(backup)}>Download</Button>
                    <Button size="sm" outline variant="warning" icon={ArchiveRestore} loading={busy === "restore"} onClick={() => { if (window.confirm("Replace the current database with this backup?")) runCommand("restore", { backup: backup.name }); }}>Restore</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
