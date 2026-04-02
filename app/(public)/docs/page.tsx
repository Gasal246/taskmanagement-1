import { ArrowUpRight, CheckCircle2, Layers3, Workflow, Youtube } from "lucide-react";
import Link from "next/link";
import DocsVideoPlayer from "./_components/docs-video-player";

export default function DocsHomePage() {
  const youtubeVideoId = "aSte18D2_YE";

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/[0.06] px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100/80">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Introduction
          </div>

          <h2 className="mt-5 max-w-3xl font-['Montserrat'] text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Organize projects and allocate tasks to team members.
          </h2>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
            Taskmanager is built to help teams organize responsibilities, structure task activity, and keep assignment ownership clear across day-to-day operations. This documentation area is the public entry point for understanding how the platform is arranged and how people move through core workflows.
          </p>

          <div className="mt-8 overflow-hidden rounded-[28px] border border-cyan-300/20 bg-slate-950/60 shadow-[0_24px_80px_rgba(8,145,178,0.16)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/70">Quick walkthrough</p>
                <p className="mt-1 text-sm text-slate-300">A short product walkthrough embedded directly from YouTube.</p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100 sm:inline-flex">
                <Youtube size={16} /> YouTube
              </div>
            </div>

            <div className="relative aspect-video bg-slate-950">
              <DocsVideoPlayer videoId={youtubeVideoId} autoPlay />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Layers3 className="h-5 w-5 text-cyan-100" />
              <h3 className="mt-4 text-lg font-semibold text-white">Organized workspaces</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Structure work with clear task records, meaningful context, and visible progress.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Workflow className="h-5 w-5 text-cyan-100" />
              <h3 className="mt-4 text-lg font-semibold text-white">Operational flow</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Keep activities and task movement connected so teams understand what happens next.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <ArrowUpRight className="h-5 w-5 text-cyan-100" />
              <h3 className="mt-4 text-lg font-semibold text-white">Confident assignment</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Make ownership explicit so task accountability remains easy to follow.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">
            Getting started
          </p>
          <h3 className="mt-4 text-2xl font-semibold text-white">
            What this docs area covers
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            This documentation serves as a centralized and continuously evolving reference for all existing and planned features of the Task Manager application. It will be regularly maintained and updated to ensure alignment with the latest developments, enhancements, and future roadmap..
          </p>

          {/* <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-semibold text-white">Home</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                A concise overview of Taskmanager and how the documentation is organized.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-semibold text-white">Task Management</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Reserved for focused workflow guides around creating tasks, task activities, and assignments.
              </p>
            </div>
          </div> */}

          <Link
            href="/"
            target="_blank"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/14"
          >
            Start Using Now
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">
            Why Taskmanager
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            The application is designed for teams that need a reliable operating layer for work coordination. It combines task creation, activity tracking, and assignment clarity in one flow so teams can move quickly without losing context.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">
            Documentation roadmap
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            The shell is ready for future sections and deeper walkthroughs. The next documentation pages can be expanded directly within the current sidebar structure without changing the overall layout.
          </p>
        </div>
      </section>
    </div>
  );
}
