import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { WorkspaceShell } from "@/components/editor/workspace-shell";
import {
  getAccessibleProject,
  getCurrentIdentity,
} from "@/lib/project-access";
import { slugify } from "@/lib/projects";
import { getOwnedProjects, getSharedProjects } from "@/lib/projects-data";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  const identity = await getCurrentIdentity();
  if (!identity.userId) {
    redirect("/sign-in");
  }

  const project = await getAccessibleProject(roomId, identity);
  if (!project) {
    return <AccessDenied />;
  }

  const [projects, sharedProjects] = await Promise.all([
    getOwnedProjects(),
    getSharedProjects(),
  ]);

  const currentProject = {
    id: project.id,
    name: project.name,
    slug: slugify(project.name),
    owned: project.ownerId === identity.userId,
  };

  return (
    <WorkspaceShell
      project={currentProject}
      projects={projects}
      sharedProjects={sharedProjects}
    />
  );
}
