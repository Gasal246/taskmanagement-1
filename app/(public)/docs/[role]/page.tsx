import { notFound, redirect } from "next/navigation";
import { getRoleBySlug } from "../_data/role-docs";

const RoleDefaultPage = async ({
  params,
}: {
  params: Promise<{ role: string }>;
}) => {
  const { role } = await params;
  const roleDoc = getRoleBySlug(role);

  if (!roleDoc) {
    notFound();
  }

  redirect(`/docs/${roleDoc.slug}/${roleDoc.contexts[0].slug}`);
};

export default RoleDefaultPage;
