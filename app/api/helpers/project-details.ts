import BusinessAreas from "@/models/business_areas.model";
import BusinessClients from "@/models/business_clients.model";
import BusinessRegions from "@/models/business_regions.model";
import BusinessTasks from "@/models/business_tasks.model";
import Users from "@/models/users.model";
import { ProjectAccess } from "@/app/api/helpers/project-access";

const id = (value: any) => value?.toString?.() ?? String(value ?? "");

export async function buildProjectDetails(access: ProjectAccess) {
  const project = access.project;
  const {
    project_supervisors: _projectSupervisors,
    account_managers: _accountManagers,
    site_operational_heads: _siteOperationalHeads,
    ...coreProject
  } = project;
  const headIds = Array.from(
    new Set(
      [
        ...(Array.isArray(project.project_heads) ? project.project_heads : []),
        project.project_head,
      ]
        .filter(Boolean)
        .map(id)
    )
  );

  const [client, region, area, projectHeads, taskCount, completedTaskCount] =
    await Promise.all([
      project.client_id
        ? BusinessClients.findById(project.client_id)
            .select("client_name category industry company_address")
            .lean()
        : null,
      project.region_id
        ? BusinessRegions.findById(project.region_id).select("region_name").lean()
        : null,
      project.area_id
        ? BusinessAreas.findById(project.area_id)
            .select("area_name region_id")
            .lean()
        : null,
      headIds.length
        ? Users.find({ _id: { $in: headIds }, status: 1 })
            .select("name email avatar_url")
            .lean()
        : [],
      BusinessTasks.countDocuments({ project_id: project._id }),
      BusinessTasks.countDocuments({
        project_id: project._id,
        status: "Completed",
      }),
    ]);

  const headMap = new Map(
    (projectHeads as any[]).map((head: any) => [id(head._id), head])
  );

  return {
    ...coreProject,
    client_id: client,
    region,
    area,
    project_heads: headIds.map((headId) => headMap.get(headId)).filter(Boolean),
    task_count: taskCount,
    completed_task_count: completedTaskCount,
    permissions: {
      canManage: access.canManage,
      canCreateTasks: access.canCreateTasks,
      canApprove: access.canApprove,
      canDelete: access.canDelete,
    },
    canEdit: access.canManage,
  };
}
