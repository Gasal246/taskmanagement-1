import Link from "next/link";
import { ArrowLeft, ArrowRight, Home, Layers, ListTree } from "lucide-react";
import { getRoleBySlug } from "../../_data/role-docs";
import { notFound } from "next/navigation";

const RoleContextDocumentationPage = async ({
  params,
}: {
  params: Promise<{ role: string; context: string }>;
}) => {
  const { role, context } = await params;
  const roleDoc = getRoleBySlug(role);

  if (!roleDoc) {
    notFound();
  }

  const currentContextIndex = roleDoc.contexts.findIndex((item) => item.slug === context);
  if (currentContextIndex === -1) {
    notFound();
  }

  const currentContext = roleDoc.contexts[currentContextIndex];
  const previousContext = currentContextIndex > 0 ? roleDoc.contexts[currentContextIndex - 1] : null;
  const nextContext =
    currentContextIndex < roleDoc.contexts.length - 1 ? roleDoc.contexts[currentContextIndex + 1] : null;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-900/60 px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-700/70 bg-slate-950/50 p-5 lg:sticky lg:top-6 lg:h-fit">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 transition hover:text-cyan-200"
          >
            <Home className="h-3.5 w-3.5" />
            Documentation Home
          </Link>

          <h1 className="mt-4 text-xl font-bold text-slate-100">{roleDoc.title}</h1>
          <p className="mt-2 text-sm text-slate-300">{roleDoc.overview}</p>

          <div className="mt-5 border-t border-slate-700 pt-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Layers className="h-3.5 w-3.5" />
              Main Contexts
            </div>

            <nav className="space-y-2">
              {roleDoc.contexts.map((item, index) => {
                const isActive = item.slug === currentContext.slug;

                return (
                  <Link
                    key={item.slug}
                    href={`/docs/${roleDoc.slug}/${item.slug}`}
                    className={`block rounded-lg border px-3 py-2 transition ${
                      isActive
                        ? "border-cyan-500/50 bg-cyan-900/30 text-cyan-100"
                        : "border-slate-700/70 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.14em]">Context {index + 1}</p>
                    <p className="mt-1 text-sm font-medium">{item.title}</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-300/90">
                      {item.innerContexts.map((inner) => (
                        <li key={`${item.slug}-${inner.title}`}>• {inner.title}</li>
                      ))}
                    </ul>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="space-y-6">
          <section className="rounded-2xl border border-slate-700/70 bg-gradient-to-r from-slate-950/80 to-slate-900/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Role Documentation</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-100">{roleDoc.title}</h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              This guide is designed to support confident, consistent execution. Use each context below to understand
              ownership, delivery standards, and practical success patterns for this role.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {roleDoc.responsibilities.map((item) => (
                <div key={item} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                  <p className="text-sm text-slate-100">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700/70 bg-slate-950/50 p-6">
            <div className="flex items-center gap-2">
              <ListTree className="h-5 w-5 text-cyan-300" />
              <h3 className="text-xl font-semibold text-slate-100">{currentContext.title}</h3>
            </div>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">{currentContext.summary}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {currentContext.innerContexts.map((innerContext) => (
                <article
                  key={innerContext.title}
                  className="rounded-xl border border-slate-700 bg-gradient-to-b from-slate-900/80 to-slate-950/70 p-4"
                >
                  <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-200">{innerContext.title}</h4>
                  <p className="mt-2 text-sm text-slate-300">{innerContext.summary}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            {previousContext ? (
              <Link
                href={`/docs/${roleDoc.slug}/${previousContext.slug}`}
                className="group rounded-xl border border-slate-700 bg-slate-900/70 p-4 transition hover:border-slate-600 hover:bg-slate-900"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Previous Context</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-100">
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                  {previousContext.title}
                </p>
              </Link>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Previous Context</p>
                <p className="mt-2 text-sm text-slate-400">You are at the first context.</p>
              </div>
            )}

            {nextContext ? (
              <Link
                href={`/docs/${roleDoc.slug}/${nextContext.slug}`}
                className="group rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4 transition hover:border-cyan-400/60 hover:bg-cyan-950/35"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-cyan-300">Next Context</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-cyan-100">
                  {nextContext.title}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </p>
              </Link>
            ) : (
              <div className="rounded-xl border border-dashed border-cyan-500/30 bg-cyan-950/10 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-cyan-300">Next Context</p>
                <p className="mt-2 text-sm text-cyan-100">You have completed the final context for this role.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default RoleContextDocumentationPage;
