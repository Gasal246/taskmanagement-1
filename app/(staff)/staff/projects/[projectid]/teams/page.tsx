"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from 'next/navigation';
import { Edit, Eye, Plus, Search, Trash2, Users, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAddNewTeam, useGetAddedProjectDepartments, useGetProjectsbyIdForStaffs, useGetStaffsByDepartment, useGetTeamsForProjects, useRemoveProjectTeams, useUpdateTeam } from '@/query/business/queries';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { Avatar } from 'antd';
import { useSession } from 'next-auth/react';

const ProjectTeams = () => {
  const router = useRouter();
  const params = useParams<{ projectid: string }>();
  const [departmentStaffs, setDepartmentStaffs] = useState<any[]>([]);
  const [addTeamDialog, setAddTeamDialog] = useState(false);
  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [currentEditingTeam, setCurrentEditingTeam] = useState<any | null>(null);
  const { data: session }: any = useSession();
  const { data: project } = useGetProjectsbyIdForStaffs(params.projectid);
  const { data: project_depts } = useGetAddedProjectDepartments(params.projectid);
  const { data: teamsForProject, isPending: fetchingTeamsForProject, refetch: refetchTeamsForProject } = useGetTeamsForProjects(params.projectid);
  const { mutateAsync: addNewTeam, isPending: addingNewTeam } = useAddNewTeam();
  const { mutateAsync: getStaffByDept } = useGetStaffsByDepartment();
  const { mutateAsync: editTeam, isPending: editing } = useUpdateTeam();
  const { mutateAsync: deleteTeam, isPending: isDeleting } = useRemoveProjectTeams();
  const [formData, setFormData] = useState({
    team_name: '',
    department_id: '',
    project_dept_id: '',
    team_lead_id: '',
    team_member_ids: [] as string[],
  });
  const [searchQueryLead, setSearchQueryLead] = useState("");
  const [searchQueryMembers, setSearchQueryMembers] = useState("");

  const currentUserId = session?.user?.id?.toString?.() ?? "";
  const projectHeadIds = useMemo(() => {
    const data = project?.data;
    return Array.from(
      new Set(
        [
          ...(Array.isArray(data?.project_heads) ? data.project_heads : []),
          data?.project_head,
        ]
          .filter(Boolean)
          .map((item: any) => item?._id?.toString?.() ?? item?.toString?.() ?? String(item))
      )
    );
  }, [project?.data]);
  const canManageTeams = currentUserId ? projectHeadIds.includes(currentUserId) : false;
  const filteredProjectDepts = project_depts?.data || [];

  const teams = teamsForProject?.data ?? [];
  const totalMembers = teams.reduce((sum: number, team: any) => sum + (team?.members?.length ?? 0), 0);
  const uniqueLeads = Array.from(new Set(teams.map((team: any) => team?.team_head?._id).filter(Boolean))).length;

  const fetchStaffs = async (dept_id: string) => {
    const res = await getStaffByDept(dept_id);
    if (res.status === 200) {
      setDepartmentStaffs(res.data);
    }
  };

  useEffect(() => {
    if (formData.department_id) {
      fetchStaffs(formData.department_id);
    } else {
      setDepartmentStaffs([]);
    }
  }, [formData.department_id]);

  useEffect(() => {
    if (currentEditingTeam) {
      setFormData({
        team_name: currentEditingTeam?.team_name,
        department_id: currentEditingTeam?.department_id,
        project_dept_id: currentEditingTeam?.project_dept_id?._id,
        team_lead_id: currentEditingTeam?.team_head?._id || '',
        team_member_ids: currentEditingTeam?.members?.map((m: any) => m.user_id) || [],
      });
      setEditTeamDialog(true);
    }
  }, [currentEditingTeam]);

  const resetForm = () => {
    setFormData({
      team_name: '',
      department_id: '',
      project_dept_id: '',
      team_lead_id: '',
      team_member_ids: [],
    });
    setSearchQueryLead('');
    setSearchQueryMembers('');
  };

  const selectDepartment = (dept_id: string) => {
    const department = filteredProjectDepts?.find((dept: any) => dept._id == dept_id);
    if (!department) return;

    setFormData({
      ...formData,
      department_id: department.department_id,
      project_dept_id: department._id,
      team_lead_id: '',
      team_member_ids: []
    });
  };

  const selectTeamLead = (id: string) => {
    setFormData(prev => {
      let updatedMembers = prev.team_member_ids;

      if (updatedMembers.includes(id)) {
        updatedMembers = updatedMembers.filter(mem => mem !== id);
      }

      return {
        ...prev,
        team_lead_id: id,
        team_member_ids: updatedMembers,
      };
    });
  };

  const handleAddOrUpdateTeam = async () => {
    if (!formData.team_name || !formData.department_id || !formData.team_lead_id) {
      toast.error("Please fill all required fields");
      return;
    }

    if (currentEditingTeam) {
      const payload = {
        _id: currentEditingTeam?._id,
        team_name: formData.team_name,
        team_head: formData.team_lead_id,
        team_members: formData.team_member_ids
      };

      const res = await editTeam(payload);
      if (res.status == 200) {
        toast.success(res.message);
        refetchTeamsForProject();
        setEditTeamDialog(false);
      } else {
        toast.error(res.message);
      }
    } else {
      const payload = {
        ...formData,
        project_id: params.projectid
      };
      const res = await addNewTeam(payload);
      if (res?.status === 201) {
        toast.success("Team added to project successfully");
        refetchTeamsForProject();
        setAddTeamDialog(false);
      } else {
        toast.error(res?.data.message || "Failed to add team to project");
      }
    }
    resetForm();
    setCurrentEditingTeam(null);
  };

  const handleRemoveTeam = async (teamId: string) => {
    try {
      const res = await deleteTeam(teamId);
      toast.success(res.message);
      refetchTeamsForProject();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete team");
    }
  };

  const filteredStaffsForLead = departmentStaffs.filter(staff =>
    staff?.user_id?.name.toLowerCase().includes(searchQueryLead.toLowerCase())
  );

  const filteredStaffsForMembers = departmentStaffs.filter(staff =>
    staff?.user_id?._id !== formData?.team_lead_id &&
    staff?.user_id?.name?.toLowerCase().includes(searchQueryMembers.toLowerCase())
  );

  const isEditMode = !!currentEditingTeam;

  if (fetchingTeamsForProject) {
    return (
      <div className='p-5 overflow-y-scroll pb-20 min-h-screen flex items-center justify-center'>
        <LoaderSpin size={40} />
      </div>
    );
  }

  return (
    <div className='p-5 overflow-y-scroll pb-20 min-h-screen'>
      <Breadcrumb className='mb-4'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace('/staff/projects')}>Manage Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.back()}>Project</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Teams</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-2xl border border-slate-800 bg-gradient-to-tr from-slate-950/70 to-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400/70">Project Teams</p>
            <h1 className="mt-2 text-lg font-semibold text-slate-100">Build focused squads with clear leads.</h1>
            <p className="mt-1 text-xs text-slate-400">Teams must belong to the departments linked to this project.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2.5 px-4 rounded-lg border border-slate-700 hover:border-cyan-500 bg-gradient-to-tr from-slate-900 to-slate-800 text-xs font-semibold flex gap-2 items-center'
            onClick={() => setAddTeamDialog(true)}
            disabled={!canManageTeams}
          >
            <Plus size={14} />
            Add Team
          </motion.button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] text-slate-500">Teams created</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{teams.length}</p>
            <p className="mt-1 text-[11px] text-slate-400">Across project departments</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] text-slate-500">Total members</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{totalMembers}</p>
            <p className="mt-1 text-[11px] text-slate-400">Including team leads</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] text-slate-500">Active leads</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{uniqueLeads}</p>
            <p className="mt-1 text-[11px] text-slate-400">Unique leaders assigned</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Users size={16} className="text-cyan-300" />
            Added Teams
          </h2>
          <p className="text-xs text-slate-500">Manage leads, members, and visibility.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {teams.length > 0 ? (
            teams.map((team: any) => (
              <div key={team._id} className="rounded-xl border border-slate-800 bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-4 hover:border-cyan-500/40 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{team.team_name}</p>
                    <p className="text-[11px] text-slate-400">Department: {team?.project_dept_id?.department_name || '-'}</p>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        className='p-1 rounded-full hover:bg-slate-800 text-xs font-medium flex items-center'
                      >
                        <UserRound size={14} className="text-slate-300" />
                      </motion.button>
                    </PopoverTrigger>
                  <PopoverContent className='w-[140px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                      <div className='flex flex-col items-start gap-1 bg-black rounded-lg p-1'>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          whileHover={{ scale: 1.02 }}
                          className='bg-slate-800/50 w-full p-2 text-cyan-500 cursor-pointer hover:text-cyan-400 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'
                          onClick={() => router.push(`/staff/projects/${params.projectid}/teams/${team?._id}`)}
                        >
                          <Eye size={12} />
                          <span className='text-xs font-medium'>View</span>
                        </motion.button>
                        {canManageTeams && (
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            whileHover={{ scale: 1.02 }}
                            className='bg-slate-800/50 w-full p-2 text-emerald-400 cursor-pointer hover:text-emerald-300 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'
                            onClick={() => setCurrentEditingTeam(team)}
                          >
                            <Edit size={12} />
                            <span className='text-xs font-medium'>Edit</span>
                          </motion.button>
                        )}
                        {canManageTeams && (
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            whileHover={{ scale: 1.02 }}
                            className='bg-slate-800/50 w-full p-2 text-red-400 cursor-pointer hover:text-red-300 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'
                            onClick={() => handleRemoveTeam(team._id)}
                            disabled={isDeleting}
                          >
                            <Trash2 size={12} />
                            <span className='text-xs font-medium'>Remove</span>
                          </motion.button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Avatar size={36} src={team?.team_head?.avatar_url} />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{team?.team_head?.name || 'Lead not set'}</p>
                    <p className="text-[11px] text-slate-500">Team Lead</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                    <p className="text-slate-500">Members</p>
                    <p className="text-slate-200 text-sm font-semibold">{team?.members?.length ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                    <p className="text-slate-500">Department</p>
                    <p className="text-slate-200 text-sm font-semibold truncate">
                      {team?.project_dept_id?.department_name || '-'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
              No teams added to this project yet.
            </div>
          )}
        </div>
      </div>

      <Dialog open={(addTeamDialog || editTeamDialog) && canManageTeams} onOpenChange={(open) => {
        if (!open) {
          setAddTeamDialog(false);
          setEditTeamDialog(false);
          setCurrentEditingTeam(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Team" : "Add Team to Project"}</DialogTitle>
            <DialogDescription>{isEditMode ? "Update team details." : "Create a team with a lead and collaborators."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] text-slate-400 mb-2">Team basics</p>
              <Input
                placeholder="Team Name"
                value={formData.team_name}
                onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                className="border-slate-700 focus:border-cyan-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              />
            </div>

            <div>
              <p className="text-[11px] text-slate-400 mb-2">Department scope</p>
              <Select value={formData.project_dept_id} onValueChange={(value) => selectDepartment(value)}>
                <SelectTrigger className="border-slate-700 focus:border-cyan-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjectDepts?.length === 0 && (
                    <SelectItem value="no-departments" disabled>
                      No departments added to this project
                    </SelectItem>
                  )}
                  {filteredProjectDepts?.map((dept: any) => (
                    <SelectItem key={dept._id} value={dept._id}>{dept.department_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.department_id && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">Select team lead</p>
                <div className="relative">
                  <Input
                    placeholder="Search team lead..."
                    value={searchQueryLead}
                    onChange={(e) => setSearchQueryLead(e.target.value)}
                    className="border-slate-700 focus:border-cyan-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-8 text-sm"
                  />
                  <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
                </div>
                <Select value={formData.team_lead_id} onValueChange={(value) => selectTeamLead(value)}>
                  <SelectTrigger className="border-slate-700 focus:border-cyan-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Select Team Lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStaffsForLead.length === 0 && (
                      <SelectItem value="no-leads" disabled>No staff found</SelectItem>
                    )}
                    {filteredStaffsForLead.map((staff: any) => (
                      <SelectItem key={staff._id} value={staff.user_id?._id}>{staff?.user_id?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.team_lead_id && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">Add team members</p>
                <div className="relative">
                  <Input
                    placeholder="Search team members..."
                    value={searchQueryMembers}
                    onChange={(e) => setSearchQueryMembers(e.target.value)}
                    className="border-slate-700 focus:border-cyan-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-8 text-sm"
                  />
                  <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
                </div>
                <div className="max-h-[140px] overflow-y-auto space-y-2 border border-slate-700 rounded-lg p-2 bg-slate-950/40">
                  {filteredStaffsForMembers.length === 0 && (
                    <p className="text-xs text-slate-500">No members found.</p>
                  )}
                  {filteredStaffsForMembers.map((staff: any) => (
                    <div key={staff._id} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.team_member_ids.includes(staff?.user_id?._id)}
                        onCheckedChange={(checked) => {
                          setFormData({
                            ...formData,
                            team_member_ids: checked
                              ? [...formData.team_member_ids, staff?.user_id?._id]
                              : formData.team_member_ids.filter(id => id !== staff?.user_id?._id),
                          });
                        }}
                      />
                      <p className="text-sm text-slate-200">{staff?.user_id?.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-2.5 px-4 rounded-lg bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-sm font-semibold text-center text-slate-200 border border-slate-700 hover:border-cyan-500"
              onClick={handleAddOrUpdateTeam}
              disabled={addingNewTeam || editing}
            >
              {isEditMode ? "Update Team" : addingNewTeam ? "Adding..." : "Add Team"}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectTeams;
