export type TaskManagementDoc = {
  slug: string;
  title: string;
  href: string;
  description: string;
};

export const docsHome = {
  title: "TaskManager Overview",
  href: "/docs",
  description: "What is Taskmanager? Why the Taskmanager?",
};

export const taskManagementDocs: TaskManagementDoc[] = [
  {
    slug: "create-task",
    title: "How to create a Task ?",
    href: "/docs/task-management/create-task",
    description: "Step-by-step guidance for creating a new task.",
  },
  {
    slug: "create-task-activity",
    title: "How to create task activity ?",
    href: "/docs/task-management/create-task-activity",
    description: "How to add and track activities within a task.",
  },
  {
    slug: "assign-task",
    title: "How to assign a task ?",
    href: "/docs/task-management/assign-task",
    description: "How to assign work clearly and keep ownership visible.",
  },
];

export function getTaskManagementDocBySlug(slug: string) {
  return taskManagementDocs.find((doc) => doc.slug === slug);
}

export function getDocsPageMeta(pathname: string) {
  if (pathname === docsHome.href) {
    return {
      title: docsHome.title,
      eyebrow: "Documentation",
      description: docsHome.description,
    };
  }

  const taskManagementDoc = taskManagementDocs.find((doc) => doc.href === pathname);

  if (taskManagementDoc) {
    return {
      title: taskManagementDoc.title,
      eyebrow: "Task Management",
      description: taskManagementDoc.description,
    };
  }

  return {
    title: "Documentation",
    eyebrow: "Documentation",
    description: "Product guides and walkthroughs for Taskmanager.",
  };
}
