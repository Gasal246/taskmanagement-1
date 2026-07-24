"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ProjectAssignmentDialog from "@/components/projects/ProjectAssignmentDialog";
import ProjectAssignmentSection from "@/components/projects/ProjectAssignmentSection";
import {
  useAddAccountManager,
  useAddProjectHead,
  useAddProjectSupervisor,
  useAddSiteOperationalHead,
  useRemoveAccountManager,
  useRemoveProjectHead,
  useRemoveProjectSupervisor,
  useRemoveSiteOperationalHead,
} from "@/query/business/queries";
import {
  projectSectionKey,
  useProjectSection,
} from "./project-details-api";
import {
  ProjectSectionError,
  ProjectSectionSkeleton,
} from "./SectionState";
import { toast } from "sonner";

type Group =
  | "project_heads"
  | "project_supervisors"
  | "account_managers"
  | "site_operational_heads";

const configs: Record<
  Group,
  { title: string; assign: string; empty: string; description: string }
> = {
  project_heads: {
    title: "Project Heads",
    assign: "Assign Project Head",
    empty: "No project heads assigned.",
    description: "People responsible for managing the project.",
  },
  project_supervisors: {
    title: "Project Supervisors",
    assign: "Assign Supervisor",
    empty: "No project supervisors assigned.",
    description: "Staff responsible for supervising project execution.",
  },
  account_managers: {
    title: "Account Managers",
    assign: "Assign Account Manager",
    empty: "No account managers assigned.",
    description: "People responsible for the project account.",
  },
  site_operational_heads: {
    title: "Site / Operational Heads",
    assign: "Assign Operational Head",
    empty: "No operational heads assigned.",
    description: "People responsible for project operations.",
  },
};

export default function OperationsSection({
  projectId,
  canManage,
  onProjectChanged,
}: {
  projectId: string;
  canManage: boolean;
  onProjectChanged: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [dialogGroup, setDialogGroup] = useState<Group | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const operations = useProjectSection<Record<Group, any[]>>(
    projectId,
    "operations"
  );
  const candidates = useProjectSection<any[]>(
    projectId,
    "assignment-candidates",
    Boolean(dialogGroup && canManage)
  );

  const addHead = useAddProjectHead();
  const removeHead = useRemoveProjectHead();
  const addSupervisor = useAddProjectSupervisor();
  const removeSupervisor = useRemoveProjectSupervisor();
  const addAccountManager = useAddAccountManager();
  const removeAccountManager = useRemoveAccountManager();
  const addOperationalHead = useAddSiteOperationalHead();
  const removeOperationalHead = useRemoveSiteOperationalHead();

  const filteredCandidates = useMemo(() => {
    const currentUsers = dialogGroup
      ? operations.data?.[dialogGroup] || []
      : [];
    const excluded = new Set(
      currentUsers.map((user: any) => user?._id?.toString?.()).filter(Boolean)
    );
    const term = search.trim().toLowerCase();
    return (candidates.data || []).filter((staff: any) => {
      const user = staff?.user_id;
      if (!user?._id || excluded.has(user._id.toString())) return false;
      return (
        !term ||
        user?.name?.toLowerCase?.().includes(term) ||
        user?.email?.toLowerCase?.().includes(term)
      );
    });
  }, [candidates.data, dialogGroup, operations.data, search]);

  const refreshAfterMutation = async (headsChanged = false) => {
    await operations.refetch();
    if (headsChanged) await onProjectChanged();
    await queryClient.invalidateQueries({
      queryKey: projectSectionKey(projectId, "flow"),
    });
  };

  const openDialog = (group: Group) => {
    setDialogGroup(group);
    setSearch("");
    setSelectedId("");
  };

  const handleAdd = async () => {
    if (!dialogGroup || !selectedId) {
      toast.error("Please select a staff member.");
      return;
    }
    const payload = { project_id: projectId, user_id: selectedId };
    const result =
      dialogGroup === "project_heads"
        ? await addHead.mutateAsync(payload)
        : dialogGroup === "project_supervisors"
          ? await addSupervisor.mutateAsync(payload)
          : dialogGroup === "account_managers"
            ? await addAccountManager.mutateAsync(payload)
            : await addOperationalHead.mutateAsync(payload);
    if (result?.status === 200) {
      toast.success(result?.message || "Assignment added.");
      const headsChanged = dialogGroup === "project_heads";
      setDialogGroup(null);
      await refreshAfterMutation(headsChanged);
    } else {
      toast.error(result?.message || "Unable to add assignment.");
    }
  };

  const handleRemove = async (group: Group, userId: string) => {
    const payload = { project_id: projectId, user_id: userId };
    const result =
      group === "project_heads"
        ? await removeHead.mutateAsync(payload)
        : group === "project_supervisors"
          ? await removeSupervisor.mutateAsync(payload)
          : group === "account_managers"
            ? await removeAccountManager.mutateAsync(payload)
            : await removeOperationalHead.mutateAsync(payload);
    if (result?.status === 200) {
      toast.success(result?.message || "Assignment removed.");
      await refreshAfterMutation(group === "project_heads");
    } else {
      toast.error(result?.message || "Unable to remove assignment.");
    }
  };

  if (operations.isPending) return <ProjectSectionSkeleton cards={4} />;
  if (operations.isError) {
    return <ProjectSectionError onRetry={() => operations.refetch()} />;
  }

  const adding =
    addHead.isPending ||
    addSupervisor.isPending ||
    addAccountManager.isPending ||
    addOperationalHead.isPending;
  const removing =
    removeHead.isPending ||
    removeSupervisor.isPending ||
    removeAccountManager.isPending ||
    removeOperationalHead.isPending;

  return (
    <>
      <div className="space-y-4">
        {(Object.keys(configs) as Group[]).map((group) => {
          const config = configs[group];
          return (
            <ProjectAssignmentSection
              key={group}
              title={config.title}
              description={config.description}
              assignLabel={config.assign}
              emptyLabel={config.empty}
              users={operations.data?.[group] || []}
              canManage={canManage}
              removing={removing}
              onAssign={() => openDialog(group)}
              onRemove={(userId) => handleRemove(group, userId)}
            />
          );
        })}
      </div>

      {dialogGroup && (
        <ProjectAssignmentDialog
          open
          onOpenChange={(open) => {
            if (!open) setDialogGroup(null);
          }}
          title={configs[dialogGroup].assign}
          description={configs[dialogGroup].description}
          search={search}
          onSearchChange={setSearch}
          staffs={filteredCandidates}
          loadingStaffs={candidates.isPending}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAdd}
          adding={adding}
          addLabel={configs[dialogGroup].assign}
        />
      )}
    </>
  );
}
