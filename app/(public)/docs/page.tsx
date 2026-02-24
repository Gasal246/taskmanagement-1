import Link from "next/link";
import { BookOpenText, Compass } from "lucide-react";
import { RoleTree } from "./_components/role-tree";
import { roleHierarchyTree } from "./_data/role-docs";

const DocumentationLandingPage = () => {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-900/60 px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl border border-slate-700/70 bg-gradient-to-r from-slate-950/80 to-slate-900/60 p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">Application Documentation</p>
          <h1 className="mt-3 text-2xl font-bold text-slate-100 sm:text-3xl">Role Navigation Hub</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
            Explore the complete operational structure for this Task Manager application. Select any role from the hierarchy
            to open its focused documentation with role purpose, scope, execution playbook, and quality guidance.
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-300 sm:text-sm">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-900/30 px-3 py-1">Professional Documentation Flow</span>
            <span className="rounded-full border border-slate-600 bg-slate-800/70 px-3 py-1">Context Sidebar + Inner Contexts</span>
            <span className="rounded-full border border-slate-600 bg-slate-800/70 px-3 py-1">Previous / Next Navigation</span>
          </div>
        </header>

        <RoleTree root={roleHierarchyTree} />

        <section className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Quick Access</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/docs/task-manager"
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-400/70 hover:bg-cyan-950/50"
            >
              <BookOpenText className="h-4 w-4" />
              Open Task Manager Guide
            </Link>
            <Link
              href="/docs/business-admin"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
            >
              <Compass className="h-4 w-4" />
              Open Business Admin Guide
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DocumentationLandingPage;
