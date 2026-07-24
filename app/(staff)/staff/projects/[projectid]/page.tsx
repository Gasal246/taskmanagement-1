"use client";

import { useParams } from "next/navigation";
import ProjectDetailsShell from "@/components/projects/details/ProjectDetailsShell";

export default function StaffProjectDetailsPage() {
  const params = useParams<{ projectid: string }>();
  return <ProjectDetailsShell projectId={params.projectid} mode="staff" />;
}
