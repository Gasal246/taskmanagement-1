import type { Metadata } from "next";

import { DocsShell } from "@/components/docs/docs-shell";

export const metadata: Metadata = {
  title: "Documentation | Taskmanager",
  description: "Public documentation for Taskmanager.",
};

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DocsShell>{children}</DocsShell>;
}
