import { redirect } from "next/navigation";

export default async function LegacyProjectTaskPage({
  params,
}: {
  params: Promise<{ projectid: string }>;
}) {
  const { projectid } = await params;
  redirect(`/staff/projects/${projectid}?section=tasks`);
}
