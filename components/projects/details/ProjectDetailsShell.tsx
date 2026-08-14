"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Files,
  LayoutDashboard,
  ListTodo,
  Settings2,
  Users,
  Workflow,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ProjectDetailsSkeleton } from "@/components/skeletons/ProjectsRouteSkeleton";
import DetailsSection from "./DetailsSection";
import {
  ProjectMode,
  ProjectSection,
  projectSectionKey,
  useProjectDetails,
} from "./project-details-api";
import {
  ProjectSectionError,
  ProjectSectionSkeleton,
} from "./SectionState";

const FlowSection = dynamic(() => import("./FlowSection"), {
  loading: () => <ProjectSectionSkeleton cards={3} />,
});
const OperationsSection = dynamic(() => import("./OperationsSection"), {
  loading: () => <ProjectSectionSkeleton cards={4} />,
});
const TeamsSection = dynamic(() => import("./TeamsSection"), {
  loading: () => <ProjectSectionSkeleton cards={4} />,
});
const ProjectTasksSection = dynamic(() => import("./ProjectTasksSection"), {
  loading: () => <ProjectSectionSkeleton cards={6} />,
});
const DepartmentsSection = dynamic(() => import("./DepartmentsSection"), {
  loading: () => <ProjectSectionSkeleton cards={4} />,
});
const DocsSection = dynamic(() => import("./DocsSection"), {
  loading: () => <ProjectSectionSkeleton cards={5} />,
  ssr: false,
});

const menu: Array<{
  value: ProjectSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { value: "details", label: "Details", icon: LayoutDashboard },
  { value: "flow", label: "Flow", icon: Workflow },
  { value: "operations", label: "Operations", icon: Settings2 },
  { value: "teams", label: "Teams", icon: Users },
  { value: "tasks", label: "Tasks", icon: ListTodo },
  { value: "departments", label: "Departments", icon: Building2 },
  { value: "docs", label: "Docs", icon: Files },
];
const validSections = new Set(menu.map((item) => item.value));

export default function ProjectDetailsShell({
  projectId,
  mode,
}: {
  projectId: string;
  mode: ProjectMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const requestedSection = searchParams.get("section") as ProjectSection | null;
  const activeSection = validSections.has(requestedSection as ProjectSection)
    ? (requestedSection as ProjectSection)
    : "details";
  const [visited, setVisited] = useState<Set<ProjectSection>>(
    () => new Set(["details", activeSection])
  );
  const details = useProjectDetails(projectId, mode);

  useEffect(() => {
    setVisited((current) => {
      if (current.has(activeSection)) return current;
      return new Set([...current, activeSection]);
    });
  }, [activeSection]);

  const canManage = Boolean(details.data?.permissions?.canManage);
  const canCreateTasks = Boolean(details.data?.permissions?.canCreateTasks);
  const projectName = details.data?.project_name || "Project";
  const basePath = `/${mode}/projects/${projectId}`;

  const switchSection = (section: ProjectSection) => {
    const next = new URLSearchParams(searchParams.toString());
    if (section === "details") next.delete("section");
    else next.set("section", section);
    const query = next.toString();
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
  };

  const refreshDetails = async () => {
    await details.refetch();
    await queryClient.invalidateQueries({
      queryKey: projectSectionKey(projectId, "flow"),
    });
  };

  const sectionProps = useMemo(
    () => ({ projectId, mode, canManage }),
    [canManage, mode, projectId]
  );

  if (details.isPending) {
    return <ProjectDetailsSkeleton />;
  }
  if (details.isError || !details.data) {
    return (
      <div className="p-4 sm:p-5">
        <ProjectSectionError onRetry={() => details.refetch()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto p-4 pb-20 sm:p-5">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              className="cursor-pointer"
              onClick={() => router.push(`/${mode}/projects`)}
            >
              Manage Projects
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{projectName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <nav
        aria-label="Project sections"
        className="mb-5 overflow-x-auto rounded-2xl border border-cyan-900/40 bg-slate-950/65 p-2"
      >
        <div className="flex min-w-max gap-2">
          {menu.map((item) => (
            <MenuButton
              key={item.value}
              item={item}
              active={activeSection === item.value}
              onClick={() => switchSection(item.value)}
            />
          ))}
        </div>
      </nav>

      <div>
        <section hidden={activeSection !== "details"}>
          <DetailsSection
            project={details.data}
            mode={mode}
            onChanged={refreshDetails}
          />
        </section>

        {visited.has("flow") && (
          <section hidden={activeSection !== "flow"}>
            <FlowSection projectId={projectId} mode={mode} />
          </section>
        )}
        {visited.has("operations") && (
          <section hidden={activeSection !== "operations"}>
            <OperationsSection
              projectId={projectId}
              canManage={canManage}
              onProjectChanged={refreshDetails}
            />
          </section>
        )}
        {visited.has("teams") && (
          <section hidden={activeSection !== "teams"}>
            <TeamsSection {...sectionProps} />
          </section>
        )}
        {visited.has("tasks") && (
          <section hidden={activeSection !== "tasks"}>
            <ProjectTasksSection
              projectId={projectId}
              mode={mode}
              canCreateTasks={canCreateTasks}
            />
          </section>
        )}
        {visited.has("departments") && (
          <section hidden={activeSection !== "departments"}>
            <DepartmentsSection {...sectionProps} />
          </section>
        )}
        {visited.has("docs") && (
          <section hidden={activeSection !== "docs"}>
            <DocsSection projectId={projectId} canManage={canManage} />
          </section>
        )}
      </div>
    </div>
  );
}

function MenuButton({
  item,
  active,
  onClick,
}: {
  item: (typeof menu)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-28 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-cyan-400 bg-cyan-950/70 text-cyan-100 shadow-[0_0_24px_-12px_rgba(34,211,238,0.8)]"
          : "border-slate-700 bg-slate-900/55 text-slate-300 hover:border-cyan-800 hover:text-white"
      }`}
    >
      <Icon
        size={16}
        className={active ? "text-cyan-300" : "text-slate-400"}
      />
      {item.label}
    </button>
  );
}
