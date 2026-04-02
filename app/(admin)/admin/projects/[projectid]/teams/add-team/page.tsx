import { redirect } from "next/navigation";

type AddTeamPageProps = {
  params: Promise<{ projectid: string }>;
};

const AddTeamPage = async ({ params }: AddTeamPageProps) => {
  const { projectid } = await params;
  redirect(`/admin/projects/${projectid}/teams`);
};

export default AddTeamPage;
