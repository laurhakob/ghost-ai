import { EditorShell } from "@/components/editor/editor-shell";
import { getOwnedProjects, getSharedProjects } from "@/lib/projects-data";

export default async function EditorPage() {
  const [projects, sharedProjects] = await Promise.all([
    getOwnedProjects(),
    getSharedProjects(),
  ]);

  return <EditorShell projects={projects} sharedProjects={sharedProjects} />;
}
