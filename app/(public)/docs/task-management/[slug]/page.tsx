import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  Sparkles,
  UserCheck,
  Youtube,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  getTaskManagementDocBySlug,
  taskManagementDocs,
} from "@/components/docs/docs-content";
import DocsVideoPlayer from "../../_components/docs-video-player";

type TaskManagementDocPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return taskManagementDocs.map((doc) => ({ slug: doc.slug }));
}

function CreateTaskDocumentation() {
  const taskDetailFields = [
    "Task Name: required",
    "Task Description: optional",
    "Comments: optional",
    "Task Duration: start date and end date are required",
    "Task Status: defaults to a valid task status",
    "Priority: optional",
  ];

  const assignmentSteps = [
    {
      title: "Choose the assignment scope",
      description:
        "Use `My Department` to assign within your current department, or `Other Department` to browse another department first.",
    },
    {
      title: "Select a department when needed",
      description:
        "If you choose `Other Department`, pick the target department from the available region, area, or location hierarchy.",
    },
    {
      title: "Filter by skills if useful",
      description:
        "The skills step is optional. Use it to narrow the staff list before choosing the assignee.",
    },
    {
      title: "Choose the staff member",
      description:
        "Search the visible staff list, review the available staff cards, and select the person who should receive the task.",
    },
  ];

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100/80">
          <FileText className="h-3.5 w-3.5" />
          Create new task
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">
            Guided 3-step assignment flow
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">
            Required date range
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">
            Staff selection before save
          </span>
        </div>
      </section>

      <div className="mt-8 overflow-hidden rounded-[28px] border border-cyan-300/20 bg-slate-950/60 shadow-[0_24px_80px_rgba(8,145,178,0.16)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/70">How to create a task ?</p>
            <p className="mt-1 text-sm text-slate-300">This video will guide you through the process of creating a task on both Admin and Staffside.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100 sm:inline-flex">
            <Youtube size={16} /> YouTube
          </div>
        </div>

        <div className="relative aspect-video bg-slate-950">
          <DocsVideoPlayer videoId="aSte18D2_YE" />
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-5 w-5 text-cyan-100" />
          <h3 className="text-xl font-semibold text-white">Open the task creation screen</h3>
        </div>
        <p className="max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
          Go to the staff task area and open the `Add Task` page from `Manage Tasks`. The screen opens with a task details form on the left and assignment steps on the right.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">Manage Tasks</span>
          <ArrowRight className="h-4 w-4 text-slate-500" />
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">Add Task</span>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-cyan-100" />
          <h3 className="text-xl font-semibold text-white">Fill in the task details</h3>
        </div>
        <p className="max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
          Complete the main task form first. A task cannot be saved without a name, a start date, an end date, and an assigned user.
        </p>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {taskDetailFields.map((field) => (
            <div
              key={field}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200"
            >
              {field}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-semibold text-white">Date selection behavior</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            The task duration uses a date-range picker. The start date is required, the end date is required, and dates before today are not allowed. If the start date changes, the end date is cleared when it no longer matches the selected range.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5 text-cyan-100" />
          <h3 className="text-xl font-semibold text-white">Complete the assignment steps</h3>
        </div>

        <div className="space-y-3">
          {assignmentSteps.map((item, index) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-semibold text-cyan-100">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-semibold text-white">What you see during staff selection</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Each staff card can show the person&apos;s name, email, skills, and active activities. This helps you assign the task with more context before saving.
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-100" />
            <h3 className="text-xl font-semibold text-white">Save the task</h3>
          </div>
          <p className="max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            After selecting the assignee in step 3, click `Save Task`. If the request succeeds, the task is created and you are redirected to that task&apos;s detail page.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-white">Before you save</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Make sure the assignee is selected and the task dates are complete. Without those, the form will not pass validation.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-white">Result</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              A new staff task is created with the chosen status, priority, date range, and assignee.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function TaskManagementDocPage({
  params,
}: TaskManagementDocPageProps) {
  const { slug } = await params;
  const doc = getTaskManagementDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  if (slug === "create-task") {
    return <CreateTaskDocumentation />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100/80">
          <FileText className="h-3.5 w-3.5" />
          Task Management
        </div>

        <h2 className="mt-5 font-['Montserrat'] text-3xl font-semibold text-white sm:text-4xl">
          {doc.title}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
          This page has been created as part of the documentation structure and is ready for its full walkthrough content. The layout, navigation, and public route are in place so the detailed guide can be added directly here next.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-white">Planned content</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            This section can later include prerequisites, exact steps, screenshots, and follow-up notes specific to this workflow without any structural changes to the docs shell.
          </p>
        </div>
      </section>

      <aside className="space-y-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-200">
            <Clock3 className="h-3.5 w-3.5 text-cyan-100" />
            In progress
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            The placeholder is intentional for now so the docs navigation is complete while the full task workflow content is designed later.
          </p>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-cyan-100">
            <Sparkles className="h-4 w-4" />
            Ready for expansion
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-200">
            Future documentation can be dropped into this page while keeping the same sidebar grouping and responsive presentation.
          </p>
        </div>
      </aside>
    </div>
  );
}
