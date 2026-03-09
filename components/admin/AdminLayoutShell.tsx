"use client"

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

type AdminLayoutShellProps = {
  children: React.ReactNode;
};

const AdminLayoutShell = ({ children }: AdminLayoutShellProps) => {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isMobileSidebarOpen]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-[-15%] h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_45%)]" />
      </div>

      <div
        onClick={() => setIsMobileSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
          isMobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-800/60 bg-slate-950/95 p-3 shadow-2xl backdrop-blur transition-transform duration-200 md:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Admin Workspace</p>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800/70"
            aria-label="Close sidebar menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="h-[calc(100dvh-4.5rem)] overflow-y-auto px-1 pb-4">
          <AdminSidebar mode="full" onNavigate={() => setIsMobileSidebarOpen(false)} />
        </div>
      </aside>

      <div className="relative z-10 flex h-[100dvh] min-h-0 flex-col">
        <div className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
          <AdminTopbar onMobileMenuClick={() => setIsMobileSidebarOpen(true)} />
        </div>

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden h-full w-[260px] border-r border-slate-800/60 bg-slate-950/70 backdrop-blur lg:block">
            <div className="px-4 pt-5 pb-3 text-[10px] uppercase tracking-[0.35em] text-slate-500">Admin Workspace</div>
            <div className="h-[calc(100dvh-3.25rem)] overflow-y-auto px-2 pb-6">
              <AdminSidebar mode="full" />
            </div>
          </aside>

          <aside className="group relative z-30 hidden h-full w-[72px] border-r border-slate-800/60 bg-slate-950/70 backdrop-blur md:block lg:hidden">
            <div className="px-3 pt-5 pb-3 text-center text-[10px] uppercase tracking-[0.25em] text-slate-500">AW</div>
            <div className="h-[calc(100dvh-3.25rem)] overflow-y-auto px-2 pb-6">
              <AdminSidebar mode="compact" />
            </div>

            <div className="pointer-events-none absolute left-0 top-0 z-50 h-full w-[260px] opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              <div className="h-full border-r border-slate-800/60 bg-slate-950/95 shadow-2xl backdrop-blur">
                <div className="px-4 pt-5 pb-3 text-[10px] uppercase tracking-[0.35em] text-slate-500">Admin Workspace</div>
                <div className="h-[calc(100dvh-3.25rem)] overflow-y-auto px-2 pb-6">
                  <AdminSidebar mode="full" />
                </div>
              </div>
            </div>
          </aside>

          <main className="relative z-0 flex-1 min-h-0 overflow-y-auto px-4 pb-10 pt-4 md:px-6">
            <div className="mx-auto w-full max-w-[1400px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayoutShell;
