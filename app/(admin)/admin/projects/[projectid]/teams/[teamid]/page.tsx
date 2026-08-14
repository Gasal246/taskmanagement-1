"use client";

import { useParams } from "next/navigation";
import TeamDetailsPage from "@/components/projects/details/TeamDetailsPage";

export default function AdminTeamDetailsPage() {
  const params = useParams<{ projectid: string; teamid: string }>();

  return (
    <TeamDetailsPage
      projectId={params.projectid}
      teamId={params.teamid}
      mode="admin"
    />
  );
}
