import { redirect } from "next/navigation";

type AddTeamPageProps = {
  params: Promise<{ projectid: string }>;
};

const AddTeamPage = async ({ params }: AddTeamPageProps) => {
  const { projectid } = await params;
  redirect(`/admin/projects/${projectid}?section=teams`);
};

export default AddTeamPage;
