"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderKanban,
  Home,
  Menu,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { docsHome, getDocsPageMeta, taskManagementDocs } from "@/components/docs/docs-content";

type DocsShellProps = {
  children: React.ReactNode;
};

type SidebarProps = {
  pathname: string;
  onNavigate?: () => void;
};

function DocsSidebar({ pathname, onNavigate }: SidebarProps) {
  const [isTaskManagementOpen, setIsTaskManagementOpen] = useState(
    pathname.startsWith("/docs/task-management")
  );

  useEffect(() => {
    if (pathname.startsWith("/docs/task-management")) {
      setIsTaskManagementOpen(true);
    }
  }, [pathname]);

  return (
    <div className="flex h-full flex-col bg-slate-950/55">
      <div className="border-b border-white/10 px-5 py-5">
        <Link
          href="/docs"
          onClick={onNavigate}
          className="group flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
            <Sparkles className="h-4 w-4 text-cyan-100 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div>
            <p className="font-['Montserrat'] text-sm font-semibold uppercase tracking-[0.28em] text-cyan-100/70">
              Taskmanager
            </p>
            <p className="text-sm font-medium text-white">Documentation</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-2">
          <Link
            href={docsHome.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              pathname === docsHome.href
                ? "bg-cyan-400/10 text-white"
                : "text-slate-200 hover:bg-white/[0.05] hover:text-white"
            )}
          >
            <Home className="h-4 w-4" />
            <span className="font-medium">{docsHome.title}</span>
          </Link>

          <Collapsible open={isTaskManagementOpen} onOpenChange={setIsTaskManagementOpen}>
            <div>
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-100 transition-colors hover:bg-white/[0.05]">
                <span className="flex items-center gap-3 font-medium">
                  <FolderKanban className="h-4 w-4 text-cyan-200" />
                  Task Management
                </span>
                {isTaskManagementOpen ? (
                  <ChevronDown className="h-4 w-4 text-slate-300" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="mt-1 space-y-1 border-l border-white/10 pb-1 pl-3 ml-5">
                  {taskManagementDocs.map((doc) => {
                    const isActive = pathname === doc.href;

                    return (
                      <Link
                        key={doc.slug}
                        href={doc.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          isActive
                            ? "bg-cyan-400/10 text-white"
                            : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                        )}
                      >
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100/80" />
                        <span className="leading-5">{doc.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </nav>
      </div>
    </div>
  );
}

export function DocsShell({ children }: DocsShellProps) {
  const pathname = usePathname();
  const pageMeta = getDocsPageMeta(pathname);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="relative h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.16),transparent_20%),radial-gradient(circle_at_82%_14%,rgba(59,130,246,0.14),transparent_18%),radial-gradient(circle_at_68%_72%,rgba(16,185,129,0.10),transparent_20%),linear-gradient(180deg,rgba(2,6,23,0.86),rgba(2,6,23,0.97))]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.8px,transparent_0.8px)] [background-size:26px_26px]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-[-5rem] top-10 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[35%] h-80 w-80 rounded-full bg-emerald-400/8 blur-3xl" />
      </div>

      <div className="relative flex h-full w-full">
        <aside className="hidden h-full w-[280px] shrink-0 border-r border-white/10 lg:block">
          <DocsSidebar pathname={pathname} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
            <div>
              <p className="font-['Montserrat'] text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/70">
                Taskmanager
              </p>
              <p className="text-base font-semibold text-white">Docs</p>
            </div>

            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[88vw] border-white/10 bg-slate-950 p-0 text-white"
              >
                <SheetTitle className="sr-only">Documentation navigation</SheetTitle>
                <DocsSidebar
                  pathname={pathname}
                  onNavigate={() => setIsMobileNavOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="border-b border-white/10 px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-3xl">
                  <p className="font-['Montserrat'] text-xs font-semibold uppercase tracking-[0.34em] text-cyan-100/65">
                    {pageMeta.eyebrow}
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                    {pageMeta.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    {pageMeta.description}
                  </p>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-cyan-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Public docs
                </div>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
