"use client";

import { useParams } from "next/navigation";
import TeamDetailsPage from "@/components/projects/details/TeamDetailsPage";

export default function StaffTeamDetailsPage() {
  const params = useParams<{ projectid: string; teamid: string }>();

  return (
    <TeamDetailsPage
      projectId={params.projectid}
      teamId={params.teamid}
      mode="staff"
    />
  );
}
