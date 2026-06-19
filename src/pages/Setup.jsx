import { Download, FileKey2, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import {
  fetchSetupCommand,
  fetchSetupStatus,
  importSetupLicense,
  waitForCommand,
} from "../api/system";
import { IS_DEVELOPMENT } from "../config/environment";

export default function Setup() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("Checking device license...");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const { data } = await fetchSetupStatus();
    setStatus(data);
    if (data.license?.allowed) {
      setMessage(`Activated for ${data.license.customer}`);
    } else {
      setMessage(data.license?.message || "A device license is required.");
    }
  };

  useEffect(() => {
    if (IS_DEVELOPMENT) {
      navigate("/login", { replace: true });
      return;
    }
    refresh().catch(() => setMessage("Could not contact the TexTradeOS PRO server."));
  }, [navigate]);

  const importLicense = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading(true);
    try {
      const document = JSON.parse(await file.text());
      const { data } = await importSetupLicense(document);
      await waitForCommand(fetchSetupCommand, data.id);
      await refresh();
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || "License import failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 p-6 flex items-center justify-center">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:grid md:grid-cols-[1.05fr_.95fr]">
        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-700 text-white">
              <FileKey2 size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Activate TexTradeOS PRO</h1>
              <p className="text-sm text-gray-500">A Product of SparkPair | Perpetual device license</p>
            </div>
          </div>

          <div className={`mt-8 rounded-2xl border p-4 text-sm ${
            status?.license?.allowed
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}>
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          </div>

          <div className="mt-7 grid gap-3">
            <a
              href="/api/setup/fingerprint"
              download
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={18} />
              Download Fingerprint Request
            </a>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white hover:bg-teal-800">
              <Upload size={18} />
              {loading ? "Importing License..." : "Import Signed License"}
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={loading}
                onChange={importLicense}
              />
            </label>
            {status?.license?.allowed && (
              <Button onClick={() => navigate("/login", { replace: true })}>
                Continue to Login
              </Button>
            )}
          </div>
        </div>

        <div className="relative hidden min-h-[480px] overflow-hidden bg-gradient-to-br from-teal-600 to-slate-900 md:block">
          <div className="absolute -right-20 top-12 h-80 w-80 rounded-full border-[28px] border-teal-300/25" />
          <div className="absolute right-12 top-28 h-56 w-56 rounded-full border-[14px] border-white/20" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-36 w-36 place-items-center rounded-[2.5rem] bg-white/10 text-7xl font-bold text-white backdrop-blur">
              T
            </div>
          </div>
          <p className="absolute bottom-9 left-9 right-9 text-sm leading-6 text-teal-50/80">
            The license is signed offline and bound to this server. It has no expiry date.
          </p>
        </div>
      </div>
    </div>
  );
}
