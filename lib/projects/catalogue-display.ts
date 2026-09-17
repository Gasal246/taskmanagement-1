export function hasProjectCatalogueDetails(project: any) {
  return Boolean(
    String(project?.project_sector || "").trim()
      || String(project?.facility_type || "").trim()
      || (Array.isArray(project?.solutions_required) && project.solutions_required.length > 0)
  );
}

export function compactProjectSolutionKeys(project: any, limit = 3) {
  const keys: string[] = Array.from(
    new Set<string>(
      (Array.isArray(project?.solutions_required) ? project.solutions_required : [])
        .filter(Boolean)
        .map(String)
    )
  );
  if (project?.primary_solution && keys.includes(String(project.primary_solution))) {
    keys.sort((left, right) =>
      left === project.primary_solution ? -1 : right === project.primary_solution ? 1 : 0
    );
  }
  const visible = keys.slice(0, Math.max(0, limit));
  return { visible, remaining: Math.max(0, keys.length - visible.length), total: keys.length };
}

export function projectCardTimeline(project: any) {
  return {
    start: project?.start_date || null,
    end: project?.end_date || null,
  };
}
