import PageHeader from "../components/PageHeader";
import SystemManagement from "../components/SystemManagement";

export default function SystemManagementPage() {
  return <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col">
    <PageHeader title="System Management" subtitle="Version, database, license, updates, network and diagnostics." />
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8"><SystemManagement /></div>
  </div>;
}
