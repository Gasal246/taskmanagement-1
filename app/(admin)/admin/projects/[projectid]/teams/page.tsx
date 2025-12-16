"use client";
import React, { useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { useParams, useRouter } from 'next/navigation';
import { Building, Edit, Plus, Trash2, Search, Users, EllipsisVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAddNewTeam, useGetAddedProjectDepartments, useGetStaffsByDepartment, useGetTeamsForProjects, useRemoveProjectTeams, useUpdateTeam } from '@/query/business/queries';
import LoaderSpin from '@/components/shared/LoaderSpin';

const ProjectTeams = () => {
  const router = useRouter();
  const params = useParams<{ projectid: string }>();
  const [departmentStaffs, setDepartmentStaffs] = useState<any[]>([]);
  const [addTeamDialog, setAddTeamDialog] = useState(false);
  const [editTeamDialog, setEditTeamDialog] = useState(false);
  const [currentEditingTeam, setCurrentEditingTeam] = useState<any | null>(null);
  const { data:project_depts, isPending: fetchingProjectDepts, refetch: refetchProjectDepts } = useGetAddedProjectDepartments(params.projectid);
  const {data: teamsForProject, isPending: fetchingTeamsForProject, refetch: refetchTeamsForProject} = useGetTeamsForProjects(params.projectid);
  const { mutateAsync: addNewTeam, isPending: addingNewTeam } = useAddNewTeam();
  const {mutateAsync: getStaffByDept, isPending} = useGetStaffsByDepartment();
  const {mutateAsync: editTeam, isPending:editing} = useUpdateTeam();
  const {mutateAsync: deleteTeam, isPending: isDeleting} = useRemoveProjectTeams();
  const [formData, setFormData] = useState({
    team_name: '',
    department_id: '',
    project_dept_id: '',
    team_lead_id: '',
    team_member_ids: [] as string[],
  });
  const [searchQueryLead, setSearchQueryLead] = useState("");
  const [searchQueryMembers, setSearchQueryMembers] = useState("");

  const fetchStaffs = async(dept_id:string) => {
    const res = await getStaffByDept(dept_id);
    if(res.status === 200){
        setDepartmentStaffs(res.data);
    }
  }

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

  useEffect(() => {
    console.log("teamsForProject", teamsForProject);
    
  }, [teamsForProject]);

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

  const selectDepartment = (dept_id:string) => {
    const department = project_depts?.data?.find((dept:any) => dept._id == dept_id);

    setFormData({
      ...formData,
      department_id: department.department_id,
      project_dept_id: department._id,
      team_lead_id: '',
      team_member_ids: []
    })
  }

  const selectTeam_Lead = (id: string) => {
  setFormData(prev => {
    let updatedMembers = prev.team_member_ids;

    // if the new lead was previously in members, remove them
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

    const data = {
      ...formData,
      project_id: params.projectid
    };
    
    if(currentEditingTeam){
      const data = {
        _id: currentEditingTeam?._id,
        team_name: formData.team_name,
        team_head: formData.team_lead_id,
        team_members: formData.team_member_ids
      };

      const res = await editTeam(data);
      if(res.status == 200){
        toast.success(res.message)
        refetchTeamsForProject();
        setAddTeamDialog(false);
      } else {
        toast.error(res.message)
      }
      
    } else {
      const res = await addNewTeam(data);
      if(res?.status === 201){
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
    const res = await deleteTeam(teamId); // success
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
  staff?.user_id?._id !== formData?.team_lead_id && // ✅ exclude selected team lead
  staff?.user_id?.name?.toLowerCase().includes(searchQueryMembers.toLowerCase())
);

  const isEditMode = !!currentEditingTeam;

  if (fetchingTeamsForProject) {
      return (
        <div className='p-5 overflow-y-scroll pb-20 min-h-screen flex items-center justify-center'>
          <LoaderSpin size={40} />
        </div>
      )
    }

  return (
    <div className='p-5 overflow-y-scroll pb-20 bg-slate-900 min-h-screen'>
      <Breadcrumb className='mb-3'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace('/admin/projects')}>Manage Projects</BreadcrumbLink>
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

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
            <Users size={14} /> Added Teams
          </h1>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className='p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center'
            onClick={() => setAddTeamDialog(true)}
          >
            <Plus size={12} />
            Add Team
          </motion.div>
        </div>
        <div className="flex flex-wrap">
          {teamsForProject?.data?.length > 0 ? (
            teamsForProject?.data?.map((team: any) => (
              <div className="w-full lg:w-3/12 p-1" key={team._id}>
                <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800 relative">
                  <h1 className="font-medium text-xs text-slate-300">{team.team_name}</h1>
                  <p className="text-xs text-slate-400">Department: {team?.project_dept_id?.department_name}</p>
                  <p className="text-xs text-slate-400">Lead: {team?.team_head?.name}</p>
                  <p className="text-xs text-slate-400">Members: {team?.members.length}</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        className='p-1 rounded-full hover:bg-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center absolute top-1 right-2'
                      >
                        <EllipsisVertical size={14} />
                      </motion.div>
                    </PopoverTrigger>
                    <PopoverContent className='w-[120px] p-0 border border-slate-800 rounded-lg overflow-hidden'>
                      <div className='flex flex-col items-start gap-1 bg-black rounded-lg'>
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          whileHover={{ scale: 1.02 }}
                          className='bg-slate-800/50 w-full p-1 py-2 text-cyan-500 cursor-pointer hover:text-cyan-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'
                          onClick={() => setCurrentEditingTeam(team)}
                        >
                          <Edit size={12} />
                          <h1 className='text-xs font-medium'>Edit</h1>
                        </motion.div>
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          whileHover={{ scale: 1.02 }}
                          className='bg-slate-800/50 w-full p-1 py-2 text-red-500 cursor-pointer hover:text-red-700 flex items-center justify-center gap-1 border border-dashed border-slate-700 rounded-lg'
                          onClick={() => handleRemoveTeam(team._id)}
                        >
                          <Trash2 size={12} />
                          <h1 className='text-xs font-medium'>Remove</h1>
                        </motion.div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No teams added to this project.</p>
          )}
        </div>
      </div>

      {/* Add/Edit Team Modal */}
      <Dialog open={addTeamDialog || editTeamDialog} onOpenChange={(open) => {
        if (!open) {
          setAddTeamDialog(false);
          setEditTeamDialog(false);
          setCurrentEditingTeam(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Team" : "Add Team to Project"}</DialogTitle>
            <DialogDescription>{isEditMode ? "Update team details." : "Create a new team for this project."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Team Name Input */}
            <Input
              placeholder="Team Name"
              value={formData.team_name}
              onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
              className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />

            {/* Department Select */}
            <Select
              value={formData.project_dept_id}
              onValueChange={(value) => selectDepartment(value)}
            >
              <SelectTrigger className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {project_depts?.data?.map((dept:any) => (
                  <SelectItem key={dept._id} value={dept._id}>{dept.department_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Team Lead Search and Select */}
            {formData.department_id && (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Search team lead..."
                    value={searchQueryLead}
                    onChange={(e) => setSearchQueryLead(e.target.value)}
                    className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-8 text-sm"
                  />
                  <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
                </div>
                <Select
                  value={formData.team_lead_id}
                  onValueChange={(value) => selectTeam_Lead(value)}
                >
                  <SelectTrigger className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Select Team Lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStaffsForLead.map((staff: any) => (
                      <SelectItem key={staff._id} value={staff.user_id?._id}>{staff?.user_id?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Team Members Search and Multi-Select */}
            {formData.team_lead_id && (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Search team members..."
                    value={searchQueryMembers}
                    onChange={(e) => setSearchQueryMembers(e.target.value)}
                    className="border-slate-600 focus:border-slate-400 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-8 text-sm"
                  />
                  <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
                </div>
                <div className="max-h-[100px] overflow-y-auto space-y-2 border border-slate-600 rounded-lg p-2">
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

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-2 px-4 rounded-lg bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-sm font-medium text-center text-slate-200 border border-slate-700 hover:border-slate-500"
              onClick={handleAddOrUpdateTeam}
            >
              {isEditMode ? "Update Team" : "Add Team"}
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectTeams;