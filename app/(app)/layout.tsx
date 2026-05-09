import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 mx-auto w-full" style={{ maxWidth: 1600 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
