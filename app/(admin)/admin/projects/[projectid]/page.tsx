"use client";

import { useParams } from "next/navigation";
import ProjectDetailsShell from "@/components/projects/details/ProjectDetailsShell";

export default function AdminProjectDetailsPage() {
  const params = useParams<{ projectid: string }>();
  return <ProjectDetailsShell projectId={params.projectid} mode="admin" />;
}
