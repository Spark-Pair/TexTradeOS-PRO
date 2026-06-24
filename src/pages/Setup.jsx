import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileKey2,
  HelpCircle,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Modal from "../components/Modal";
import {
  fetchSetupCommand,
  fetchSetupStatus,
  importSetupLicense,
  waitForCommand,
} from "../api/system";
import { IS_DEVELOPMENT } from "../config/environment";

const steps = [
  {
    title: "Download Fingerprint Request",
    text: "This file identifies this server/device for offline activation.",
  },
  {
    title: "Send the fingerprint file to SparkPair",
    text: "SparkPair verifies the request and generates a signed license file.",
  },
  {
    title: "Import Signed License",
    text: "Select the received JSON license file and wait for verification.",
  },
  {
    title: "Continue to Login",
    text: "After activation, the login button becomes available.",
  },
];

export default function Setup() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("Checking device license...");
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const isActivated = Boolean(status?.license?.allowed);

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
    <div className="min-h-screen bg-[#f8fbfb] px-4 py-6 text-[#15191b] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="w-full overflow-hidden rounded-[22px] border border-[#b8caca] bg-white shadow-[0_16px_42px_rgba(15,90,90,0.11)]">
          <div className="flex min-h-[78px] flex-col gap-4 border-b border-[#e1eeee] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-[#e1eeee] bg-[#f8fbfb] shadow-[0_8px_18px_rgba(15,90,90,0.05)]">
                <img src="/favicon.ico" alt="TexTradeOS PRO" className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-[#0f5a5a] sm:text-lg">TexTradeOS PRO</h1>
                <p className="text-xs text-[#7d8f8f] sm:hidden">A Product of SparkPair</p>
              </div>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
                isActivated
                  ? "text-[#0f5a5a]"
                  : "text-[#647676]"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isActivated ? "bg-emerald-500" : "bg-[#0f5a5a]"}`} />
              {isActivated ? "Activated" : "Secure Setup"}
            </span>
          </div>

          <div className="grid md:grid-cols-[1fr_0.86fr]">
            <main className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d6e8e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#536565]">
                <FileKey2 size={15} />
                Device License
              </div>

              <div className="mt-5 max-w-xl">
                <h2 className="text-4xl font-semibold leading-[1.05] text-[#15191b] sm:text-5xl">
                  Activate your
                  <span className="block text-[#0f5a5a]">workspace</span>
                </h2>
                <p className="mt-4 max-w-lg text-base leading-7 text-[#647676]">
                  Download this device fingerprint, import the signed license, and continue to your secure local workspace.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {["Fingerprint", "License", "Workspace"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#d6e8e8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#536565]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div
                className={`mt-8 rounded-[18px] border px-4 py-3.5 ${
                  isActivated
                    ? "border-emerald-200 bg-[#f3fbf7]"
                    : "border-[#ead7ad] bg-[#fffaf0]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 ${
                      isActivated ? "text-emerald-700" : "text-[#9a6a16]"
                    }`}
                  >
                    {isActivated ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${isActivated ? "text-emerald-800" : "text-[#8a5b10]"}`}>
                      {isActivated ? "License active" : "License required"}
                    </p>
                    <p className={`mt-1 text-sm leading-6 ${isActivated ? "text-emerald-800" : "text-[#8a5b10]"}`}>
                      {message}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href="/api/setup/fingerprint"
                  download
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[#b8caca] bg-white px-4 py-2.5 text-sm font-semibold text-[#0f5a5a] transition hover:bg-[#f7fbfb]"
                >
                  <Download size={17} />
                  Download Fingerprint
                </a>

                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-[#0f5a5a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c4949]">
                  {loading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                  ) : (
                    <Upload size={17} />
                  )}
                  {loading ? "Importing..." : "Import Signed License"}
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    disabled={loading}
                    onChange={importLicense}
                  />
                </label>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#647676] transition hover:text-[#0f5a5a]"
                  onClick={() => setShowInstructions(true)}
                >
                  <HelpCircle size={16} />
                  How activation works
                </button>

                {isActivated && (
                  <Button
                    icon={ShieldCheck}
                    className="min-h-11 w-full rounded-[14px] bg-[#0f5a5a] hover:bg-[#0c4949]"
                    onClick={() => navigate("/login", { replace: true })}
                  >
                    Continue to Login
                  </Button>
                )}
              </div>
            </main>

            <aside className="relative hidden min-h-[430px] overflow-hidden md:block">
              <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(#e1eeee_1px,transparent_1px),linear-gradient(90deg,#e1eeee_1px,transparent_1px)] [background-size:28px_28px]" />
              <div className="relative flex h-full flex-col items-center justify-center px-6 py-9">
                <div className="w-full max-w-[410px]">
                  <div className="relative mx-auto h-[280px] w-[390px] max-w-full">
                    <div className="absolute right-0 top-0 h-[162px] w-[290px] rounded-[22px] border border-[#e1eeee] bg-white/60" />
                    <div className="absolute right-[26px] top-[26px] h-[162px] w-[290px] rounded-[22px] border border-[#d6e8e8] bg-white/80" />

                    <div className="absolute right-[52px] top-[52px] w-[290px] overflow-hidden rounded-[22px] border border-[#c6dcdc] bg-white">
                      <div className="flex h-10 items-center gap-2 border-b border-[#e1eeee] px-4">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#c6dcdc]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#d6e8e8]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#e1eeee]" />
                      </div>

                      <div className="p-5">
                        <div className="rounded-[17px] border border-[#d6e8e8] bg-[#f8fbfb] p-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[#e1eeee] bg-white">
                              <img src="/favicon.ico" alt="TexTradeOS PRO" className="h-7 w-7" />
                            </span>
                            <div className="min-w-0 flex-1 space-y-2">
                              <span className="block h-2.5 w-4/5 rounded-full bg-[#bdd5d5]" />
                              <span className="block h-2.5 w-3/5 rounded-full bg-[#e1eeee]" />
                            </div>
                            <ShieldCheck size={18} className="text-[#0f5a5a]" />
                          </div>
                          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e1eeee]">
                            <div className={`h-full rounded-full bg-[#0f5a5a] ${isActivated ? "w-full" : "w-[58%]"}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mx-auto mt-1 flex max-w-[340px] items-center justify-between border-t border-[#e1eeee] pt-4">
                    <span className="text-sm text-[#647676]">Device-bound license</span>
                    <span className="text-sm font-semibold text-[#0f5a5a]">
                      {isActivated ? "Verified" : "Required"}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="grid gap-4 border-t border-[#e1eeee] px-5 py-4 text-sm text-[#7d8f8f] sm:grid-cols-[1fr_auto] sm:px-8">
            <p>The license is signed offline and bound to this server. It has no expiry date.</p>
            <span>{status?.version ? `v${status.version}` : "A Product of SparkPair"}</span>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        title="How activation works"
        subtitle="Follow these steps to activate TexTradeOS PRO on this device."
        maxWidth="max-w-xl border border-[#b8caca]"
      >
        <div className="space-y-5 text-[#536565]">
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-3 rounded-2xl border border-[#c6d8d8] bg-[#fbfdfd] p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0f5a5a] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#15191b]">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6">{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-700" />
              <div>
                <h3 className="text-sm font-semibold text-amber-900">Troubleshooting</h3>
                <p className="mt-1 text-sm text-amber-900">If license import fails, make sure:</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
                  <li>the file is a valid JSON license</li>
                  <li>the license belongs to this device</li>
                  <li>the TexTradeOS PRO server is running</li>
                  <li>contact SparkPair support if the issue continues</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
