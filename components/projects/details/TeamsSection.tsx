"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "antd";
import { motion } from "framer-motion";
import { Eye, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import {
  useAddNewTeam,
  useGetAddedProjectDepartments,
  useGetStaffsByDepartment,
  useGetTeamsForProjects,
} from "@/query/business/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ProjectSectionError,
  ProjectSectionSkeleton,
} from "./SectionState";

type TeamMember = {
  _id?: string;
  user_id?: {
    _id?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  } | string;
};

type ProjectTeam = {
  _id: string;
  team_name?: string;
  team_head?: {
    _id?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  project_dept_id?: {
    _id?: string;
    department_name?: string;
  };
  members?: TeamMember[];
};

const emptyForm = {
  team_name: "",
  department_id: "",
  project_dept_id: "",
  team_lead_id: "",
  team_member_ids: [] as string[],
};

const memberUser = (member: TeamMember) =>
  typeof member.user_id === "string" ? null : member.user_id;

export default function TeamsSection({
  projectId,
  mode,
  canManage,
}: {
  projectId: string;
  mode: "admin" | "staff";
  canManage: boolean;
}) {
  const router = useRouter();
  const [addTeamDialog, setAddTeamDialog] = useState(false);
  const [membersTeam, setMembersTeam] = useState<ProjectTeam | null>(null);
  const [departmentStaffs, setDepartmentStaffs] = useState<any[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [searchQueryLead, setSearchQueryLead] = useState("");
  const [searchQueryMembers, setSearchQueryMembers] = useState("");

  const teamsQuery = useGetTeamsForProjects(projectId);
  const { data: projectDepartments } = useGetAddedProjectDepartments(projectId);
  const { mutateAsync: addNewTeam, isPending: addingNewTeam } = useAddNewTeam();
  const { mutateAsync: getStaffByDepartment, isPending: loadingStaff } =
    useGetStaffsByDepartment();

  const teams = (teamsQuery.data?.data ?? []) as ProjectTeam[];
  const departments = projectDepartments?.data ?? [];
  const totalMembers = teams.reduce(
    (sum, team) => sum + (team.members?.length ?? 0),
    0
  );
  const uniqueLeads = new Set(
    teams.map((team) => team.team_head?._id).filter(Boolean)
  ).size;

  useEffect(() => {
    let cancelled = false;

    const loadStaff = async () => {
      if (!formData.department_id) {
        setDepartmentStaffs([]);
        return;
      }

      const response = await getStaffByDepartment(formData.department_id);
      if (!cancelled) {
        setDepartmentStaffs(response?.status === 200 ? response.data ?? [] : []);
      }
    };

    void loadStaff();
    return () => {
      cancelled = true;
    };
  }, [formData.department_id, getStaffByDepartment]);

  const filteredStaffsForLead = useMemo(
    () =>
      departmentStaffs.filter((staff) =>
        staff?.user_id?.name
          ?.toLowerCase()
          .includes(searchQueryLead.toLowerCase())
      ),
    [departmentStaffs, searchQueryLead]
  );

  const filteredStaffsForMembers = useMemo(
    () =>
      departmentStaffs.filter(
        (staff) =>
          staff?.user_id?._id !== formData.team_lead_id &&
          staff?.user_id?.name
            ?.toLowerCase()
            .includes(searchQueryMembers.toLowerCase())
      ),
    [departmentStaffs, formData.team_lead_id, searchQueryMembers]
  );

  const resetForm = () => {
    setFormData(emptyForm);
    setDepartmentStaffs([]);
    setSearchQueryLead("");
    setSearchQueryMembers("");
  };

  const closeAddDialog = () => {
    setAddTeamDialog(false);
    resetForm();
  };

  const selectDepartment = (projectDepartmentId: string) => {
    const department = departments.find(
      (item: any) => item._id === projectDepartmentId
    );
    if (!department) return;

    setFormData((current) => ({
      ...current,
      department_id: department.department_id?.toString?.() ?? department.department_id,
      project_dept_id: department._id,
      team_lead_id: "",
      team_member_ids: [],
    }));
  };

  const selectTeamLead = (userId: string) => {
    setFormData((current) => ({
      ...current,
      team_lead_id: userId,
      team_member_ids: current.team_member_ids.filter((id) => id !== userId),
    }));
  };

  const handleAddTeam = async () => {
    if (
      !formData.team_name.trim() ||
      !formData.department_id ||
      !formData.project_dept_id ||
      !formData.team_lead_id
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const response = await addNewTeam({
        ...formData,
        team_name: formData.team_name.trim(),
        project_id: projectId,
      });

      if (response?.status !== 201) {
        toast.error(response?.data?.message || "Failed to add team to project");
        return;
      }

      toast.success(response.data?.message || "Team added to project successfully");
      await teamsQuery.refetch();
      closeAddDialog();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to add team"
      );
    }
  };

  if (teamsQuery.isPending) return <ProjectSectionSkeleton cards={4} />;
  if (teamsQuery.isError) {
    return <ProjectSectionError onRetry={() => teamsQuery.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-tr from-slate-950/70 to-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400/70">
              Project Teams
            </p>
            <h1 className="mt-2 text-lg font-semibold text-slate-100">
              Build focused squads with clear leads.
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Teams must belong to the departments linked to this project.
            </p>
          </div>
          {canManage && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-gradient-to-tr from-slate-900 to-slate-800 p-2.5 px-4 text-xs font-semibold hover:border-cyan-500 sm:w-auto"
              onClick={() => setAddTeamDialog(true)}
            >
              <Plus size={14} />
              Add Team
            </motion.button>
          )}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatCard
            label="Teams created"
            value={teams.length}
            caption="Across project departments"
          />
          <StatCard
            label="Total members"
            value={totalMembers}
            caption="Assigned team members"
          />
          <StatCard
            label="Active leads"
            value={uniqueLeads}
            caption="Unique leaders assigned"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Users size={16} className="text-cyan-300" />
            Added Teams
          </h2>
          <p className="text-xs text-slate-500">
            View teams and their assigned members.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team._id}
              className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-4 transition hover:border-cyan-500/40"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {team.team_name || "Unnamed team"}
                </p>
                <p className="text-[11px] text-slate-400">
                  Department: {team.project_dept_id?.department_name || "-"}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Avatar
                  size={36}
                  src={team.team_head?.avatar_url || "/avatar.png"}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-200">
                    {team.team_head?.name || "Lead not set"}
                  </p>
                  <p className="text-[11px] text-slate-500">Team Lead</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={() => setMembersTeam(team)}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-left transition hover:border-cyan-700 hover:bg-cyan-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <span className="text-slate-500">Members</span>
                  <span className="block text-sm font-semibold text-cyan-200">
                    {team.members?.length ?? 0}
                  </span>
                </button>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                  <p className="text-slate-500">Department</p>
                  <p className="truncate text-sm font-semibold text-slate-200">
                    {team.project_dept_id?.department_name || "-"}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full border-slate-700 text-xs text-slate-200 hover:border-cyan-600 hover:text-cyan-100"
                onClick={() =>
                  router.push(`/${mode}/projects/${projectId}/teams/${team._id}`)
                }
              >
                <Eye className="mr-2 size-4" />
                View Team
              </Button>
            </div>
          ))}

          {teams.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
              No teams added to this project yet.
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={Boolean(membersTeam)}
        onOpenChange={(open) => !open && setMembersTeam(null)}
      >
        <SheetContent className="w-full border-slate-800 bg-slate-950 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{membersTeam?.team_name || "Team"} Members</SheetTitle>
            <SheetDescription>
              {membersTeam?.members?.length ?? 0} assigned member
              {(membersTeam?.members?.length ?? 0) === 1 ? "" : "s"}.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
              Team Head
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-cyan-900/60 bg-gradient-to-r from-cyan-950/35 to-slate-900/60 p-3">
              <Avatar
                size={44}
                src={membersTeam?.team_head?.avatar_url || "/avatar.png"}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {membersTeam?.team_head?.name || "No team head assigned"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {membersTeam?.team_head?.email || "No email available"}
                </p>
              </div>
            </div>

            <div className="mb-3 mt-6 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Members</h3>
              <span className="text-[11px] text-slate-500">
                {membersTeam?.members?.length ?? 0} total
              </span>
            </div>
            <div className="space-y-3">
              {(membersTeam?.members ?? []).map((member, index) => {
                const user = memberUser(member);
                return (
                  <div
                    key={member._id || user?._id || index}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3"
                  >
                    <Avatar size={40} src={user?.avatar_url || "/avatar.png"} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {user?.name || "Unknown member"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {user?.email || "No email available"}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(membersTeam?.members?.length ?? 0) === 0 && (
                <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
                  No members assigned to this team yet.
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={addTeamDialog && canManage}
        onOpenChange={(open) => {
          if (!open) closeAddDialog();
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Add Team to Project</DialogTitle>
            <DialogDescription>
              Create a team with a lead and collaborators.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] text-slate-400">Team basics</p>
              <Input
                placeholder="Team Name"
                value={formData.team_name}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    team_name: event.target.value,
                  }))
                }
                className="border-slate-700 text-sm focus:border-cyan-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div>
              <p className="mb-2 text-[11px] text-slate-400">
                Department scope
              </p>
              <Select
                value={formData.project_dept_id}
                onValueChange={selectDepartment}
              >
                <SelectTrigger className="border-slate-700 focus:border-cyan-500 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.length === 0 && (
                    <SelectItem value="no-departments" disabled>
                      No departments added to this project
                    </SelectItem>
                  )}
                  {departments.map((department: any) => (
                    <SelectItem key={department._id} value={department._id}>
                      {department.department_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.department_id && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">Select team lead</p>
                <SearchInput
                  value={searchQueryLead}
                  onChange={setSearchQueryLead}
                  placeholder="Search team lead..."
                />
                <Select
                  value={formData.team_lead_id}
                  onValueChange={selectTeamLead}
                  disabled={loadingStaff}
                >
                  <SelectTrigger className="border-slate-700 focus:border-cyan-500 focus:ring-0 focus:ring-offset-0">
                    <SelectValue
                      placeholder={loadingStaff ? "Loading staff..." : "Select Team Lead"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStaffsForLead.length === 0 && (
                      <SelectItem value="no-leads" disabled>
                        No staff found
                      </SelectItem>
                    )}
                    {filteredStaffsForLead.map((staff) => (
                      <SelectItem
                        key={staff._id}
                        value={staff.user_id?._id}
                      >
                        {staff.user_id?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.team_lead_id && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">Add team members</p>
                <SearchInput
                  value={searchQueryMembers}
                  onChange={setSearchQueryMembers}
                  placeholder="Search team members..."
                />
                <div className="max-h-[140px] space-y-2 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/40 p-2">
                  {filteredStaffsForMembers.length === 0 && (
                    <p className="text-xs text-slate-500">No members found.</p>
                  )}
                  {filteredStaffsForMembers.map((staff) => {
                    const userId = staff.user_id?._id;
                    return (
                      <label
                        key={staff._id}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={formData.team_member_ids.includes(userId)}
                          onCheckedChange={(checked) =>
                            setFormData((current) => ({
                              ...current,
                              team_member_ids: checked
                                ? [...current.team_member_ids, userId]
                                : current.team_member_ids.filter(
                                    (id) => id !== userId
                                  ),
                            }))
                          }
                        />
                        <span className="text-sm text-slate-200">
                          {staff.user_id?.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              type="button"
              className="w-full border border-slate-700 bg-gradient-to-tr from-slate-900 to-slate-800 text-slate-200 hover:border-cyan-500 hover:from-slate-900 hover:to-slate-800"
              onClick={handleAddTeam}
              disabled={addingNewTeam}
            >
              {addingNewTeam ? "Adding..." : "Add Team"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{caption}</p>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-slate-700 pl-8 text-sm focus:border-cyan-500 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
    </div>
  );
}
